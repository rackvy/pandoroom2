import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { createHash } from 'crypto';

const DEFAULT_API_URL = 'https://securepay.tinkoff.ru/v2';
const DEFAULT_SUCCESS_URL = 'https://pandoroom.e-rma.ru/payment/success';
const DEFAULT_FAIL_URL = 'https://pandoroom.e-rma.ru/payment/fail';

/** Статусы Т-Банка → значения paymentStatus в нашей базе. */
const STATUS_MAP: Record<string, string> = {
  NEW: 'pending',
  FORM_URL: 'pending',
  AUTHORIZED: 'pending',
  CONFIRMED: 'paid',
  REJECTED: 'failed',
  CANCELED: 'failed',
  REVERSED: 'refunded',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'refunded',
};

interface TbankConfig {
  terminalKey?: string;
  password?: string;
  apiUrl: string;
  successUrl: string;
  failUrl: string;
  notificationUrl?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationsService,
  ) {}

  private async tbankConfig(): Promise<TbankConfig> {
    const cfg = await this.integrations.values('tbank');
    return {
      terminalKey: cfg.terminalKey,
      password: cfg.password,
      apiUrl: (cfg.apiUrl || DEFAULT_API_URL).replace(/\/+$/, ''),
      successUrl: cfg.successUrl || DEFAULT_SUCCESS_URL,
      failUrl: cfg.failUrl || DEFAULT_FAIL_URL,
      notificationUrl: cfg.notificationUrl,
    };
  }

  async createPaymentLink(bookingId: string, amount: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    const cfg = await this.tbankConfig();

    if (!cfg.terminalKey || !cfg.password) {
      // Stub mode
      const stubPaymentId = `stub-${Date.now()}`;
      const stubUrl = `${cfg.successUrl}?stub=true&orderId=${bookingId}`;

      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'pending',
          paymentId: stubPaymentId,
          paymentUrl: stubUrl,
        },
      });

      this.logger.log(`[STUB] Payment link created: ${stubUrl}`);
      return { paymentUrl: stubUrl, paymentId: stubPaymentId };
    }

    if (!(amount > 0)) {
      throw new BadRequestException('Сумма оплаты должна быть больше нуля');
    }

    let init: any;
    try {
      init = await this.request(cfg, 'Init', {
        Amount: Math.round(amount * 100), // копейки
        OrderId: bookingId,
        Description: `Бронирование Pandoroom #${bookingId.slice(0, 8)}`,
        SuccessURL: cfg.successUrl,
        FailURL: cfg.failUrl,
        LanguageCharge: 'ru',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка Т-Банка';
      this.logger.error(`TBank Init failed: ${message}`);
      return { paymentUrl: null, paymentId: null, error: message };
    }

    const paymentId = init.PaymentId?.toString();
    const paymentUrl = init.PaymentURL || init.URL || null;

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: 'pending',
        paymentId,
        paymentUrl,
      },
    });

    return { paymentUrl, paymentId };
  }

  async getPaymentStatus(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true, paymentId: true, paymentUrl: true, paidAt: true, depositRub: true, paymentMethod: true },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');
    return booking;
  }

  /**
   * HTTP-уведомление от Т-Банка. Статусу из уведомления не доверяем:
   * переспрашиваем банк через GetState и только его ответ пишем в базу.
   */
  async handleWebhook(body: any): Promise<void> {
    const orderId = typeof body?.OrderId === 'string' ? body.OrderId : null;
    if (!orderId) {
      this.logger.warn('TBank webhook без OrderId — игнорируем');
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: orderId },
      select: { id: true, paymentId: true, paidAt: true },
    });
    if (!booking) {
      this.logger.warn(`TBank webhook по неизвестной брони ${orderId}`);
      return;
    }

    const notifiedStatus = String(body?.Status || '').toUpperCase();
    const cfg = await this.tbankConfig();
    const stubPayment = !booking.paymentId || booking.paymentId.startsWith('stub-');
    let status = notifiedStatus;

    if (cfg.terminalKey && cfg.password) {
      // Уведомлению не верим ни при каких условиях: переспрашиваем банк.
      // Без этого подделанный POST с Status=CONFIRMED помечал бронь оплаченной.
      const state = await this.request(cfg, 'GetState', {
        OrderId: orderId,
        ...(stubPayment ? {} : { PaymentId: booking.paymentId }),
      });
      status = String(state.Status || '').toUpperCase();
      if (status !== notifiedStatus) {
        this.logger.log(`TBank ${orderId}: уведомление ${notifiedStatus}, банк ${status || '—'}`);
      }
    } else if (!stubPayment) {
      this.logger.warn(`TBank ${orderId}: ключей терминала нет, но paymentId живой — статус не меняем`);
      return;
    }

    if (!status) {
      this.logger.warn(`TBank ${orderId}: пустой статус, ничего не меняем`);
      return;
    }

    const data: Record<string, unknown> = {
      paymentStatus: STATUS_MAP[status] || status.toLowerCase(),
    };
    if (status === 'CONFIRMED') data.paidAt = booking.paidAt || new Date();

    await this.prisma.booking.update({ where: { id: orderId }, data });
    this.logger.log(`TBank ${orderId}: ${notifiedStatus || '—'} → ${data.paymentStatus}`);
  }

  private async request(
    cfg: TbankConfig,
    action: 'Init' | 'GetState',
    params: Record<string, unknown>,
  ): Promise<any> {
    const payload: Record<string, unknown> = {
      ...params,
      TerminalKey: cfg.terminalKey,
    };
    payload.Token = this.sign(payload, cfg.password as string);

    let response: Response;
    try {
      response = await fetch(`${cfg.apiUrl}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const cause = (err as { cause?: { code?: string } })?.cause;
      const code = cause?.code || 'сеть недоступна';
      const note =
        code === 'SELF_SIGNED_CERT_IN_CHAIN'
          ? ' — цепочка сертификатов Т-Банка от Минцифры не доверена в Node'
          : '';
      throw new Error(`${action}: нет связи с Т-Банком (${code})${note}`);
    }

    const result = await response.json().catch(() => null);
    if (!result) {
      throw new Error(`${action}: пустой ответ (HTTP ${response.status})`);
    }
    if (result.Success !== true) {
      throw new Error(
        `${action}: ${result.Message || result.Details || result.StatusCode || 'ошибка'}`,
      );
    }
    return result;
  }

  /**
   * Токен Т-Банка: SHA-256 от значений всех параметров, отсортированных по
   * имени ключа, где Password участвует как обычный параметр (то есть в своей
   * алфавитной позиции, а не в конце строки).
   */
  private sign(params: Record<string, unknown>, password: string): string {
    const data: Record<string, unknown> = { ...params, Password: password };
    const signature = Object.keys(data)
      .filter(
        (key) =>
          key !== 'Token' && data[key] !== undefined && data[key] !== null && data[key] !== '',
      )
      .sort()
      .map((key) => {
        const value = data[key];
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      })
      .join('');

    return createHash('sha256').update(signature).digest('hex');
  }
}
