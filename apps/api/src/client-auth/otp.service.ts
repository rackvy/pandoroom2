import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { ChannelKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelRegistry } from '../integrations/channels/channel-registry';
import { ZvonokService } from '../zvonok/zvonok.service';
import { ZvonokDeliveryError } from '../zvonok/zvonok-error';
import { isValidPhone, maskPhone, normalizePhone, toMsisdn } from './phone';
import {
  AVAILABLE_MESSENGERS,
  MessengerChannel,
  otpChannelLabel,
  otpMessage,
} from './otp-message';

export type EntryChannel = 'call' | 'sms';
export type OtpChannel = EntryChannel | MessengerChannel;

const CODE_TTL_SEC = 300;
const RESEND_COOLDOWN_SEC = 60;
// Штатный сценарий — звонок, повтор, Telegram, MAX: пять отправок в него не влезают.
const LIMIT_PER_HOUR = 10;
const LIMIT_PER_DAY = 20;
const LIMIT_IP_PER_DAY = 20;
const MAX_ATTEMPTS = 5;

/** Сколько ждать звонок, прежде чем предложить запасные способы. */
const FALLBACK_AFTER_SEC = 120;

const MESSENGER_KIND: Record<MessengerChannel, ChannelKind> = {
  telegram: ChannelKind.TELEGRAM,
  max: ChannelKind.MAX,
};

const DELIVERY_OUTAGE_TEXT =
  'Не удалось отправить код: у нас временные неполадки с телефонией. ' +
  'Мы уже разбираемся — попробуйте через пару минут.';

export interface OtpSendResult {
  sent: true;
  channel: OtpChannel;
  expiresInSec: number;
  retryAfterSec: number;
  /** Через сколько секунд показать запасные способы (имеет смысл для звонка). */
  fallbackAfterSec: number;
  /** Способы, которые провайдер реально готов доставить сейчас. */
  fallbackChannels: MessengerChannel[];
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private zvonok: ZvonokService,
    private registry: ChannelRegistry,
  ) {}

  /** Публично: какие способы доставки кода сейчас реально настроены. */
  async channels(): Promise<{ channels: EntryChannel[] }> {
    const cfg = await this.zvonok.config();
    const channels: EntryChannel[] = [];
    if (cfg.publicKey && cfg.callCampaignId) channels.push('call');
    if (cfg.publicKey && cfg.smsCampaignId) channels.push('sms');
    return { channels };
  }

  async send(rawPhone: string, channel: OtpChannel, ip: string | null): Promise<OtpSendResult> {
    const phone = normalizePhone(rawPhone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException('Введите номер в формате +7 XXX XXX-XX-XX');
    }

    const now = Date.now();
    const retryAfter = await this.checkLimits(phone, ip, now);
    if (retryAfter) {
      throw new BadRequestException(
        `Код уже отправлен. Попробуйте снова через ${retryAfter} сек.`,
      );
    }

    const code = String(randomInt(100000, 1000000));
    if (channel === 'telegram' || channel === 'max') {
      await this.sendViaMessenger(phone, channel, code, ip, now);
    } else {
      // Сначала доставка: если Zvonok отказал, кода в базе быть не должно
      let delivered;
      try {
        delivered =
          channel === 'sms'
            ? await this.zvonok.sendCodeBySms(toMsisdn(phone), code)
            : await this.zvonok.sendCodeByCall(toMsisdn(phone));
      } catch (err) {
        throw await this.deliveryFailure(err, phone, channel);
      }

      await this.persist(phone, delivered.pincode, channel, ip, now);
      this.logger.log(
        `OTP sent to ${maskPhone(phone)} via ${channel} (call ${delivered.callId ?? 'n/a'})`,
      );
    }

    return this.result(channel);
  }

  /**
   * Запасной путь: наш шестизначный код уходит текстом через Wazzup. Код
   * пишется в базу только после успеха провайдера — иначе гость ждал бы
   * сообщение, которого не будет, с «живым» кодом в базе.
   */
  private async sendViaMessenger(
    phone: string,
    channel: MessengerChannel,
    code: string,
    ip: string | null,
    now: number,
  ): Promise<void> {
    const kind = MESSENGER_KIND[channel];
    if (!(await this.registry.available()).includes(kind)) {
      throw new BadRequestException(
        `Отправка кода в ${otpChannelLabel(channel)} сейчас недоступна. Попробуйте другой способ.`,
      );
    }

    const driver = await this.registry.driver();
    try {
      // Именно номер, не MSISDN: драйвер различает номер и chatId по цифрам,
      // а плюс превратил бы адресата в неверный chatId.
      await driver.send(kind, phone, otpMessage(code, CODE_TTL_SEC / 60));
    } catch (err) {
      throw await this.deliveryFailure(err, phone, channel);
    }

    await this.persist(phone, code, channel, ip, now);
    this.logger.log(`OTP sent to ${maskPhone(phone)} via ${channel}`);
  }

  /** Общее сохранение для обеих веток: последняя отправка побеждает. */
  private async persist(
    phone: string,
    code: string,
    channel: OtpChannel,
    ip: string | null,
    now: number,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.otpCode.deleteMany({ where: { phone, consumedAt: null } }),
      this.prisma.otpCode.create({
        data: {
          phone,
          codeHash: await bcrypt.hash(code, 10),
          channel,
          ip,
          expiresAt: new Date(now + CODE_TTL_SEC * 1000),
        },
      }),
    ]);
  }

  private async result(channel: OtpChannel): Promise<OtpSendResult> {
    return {
      sent: true,
      channel,
      expiresInSec: CODE_TTL_SEC,
      retryAfterSec: RESEND_COOLDOWN_SEC,
      fallbackAfterSec: FALLBACK_AFTER_SEC,
      fallbackChannels: await this.availableMessengers(),
    };
  }

  private async availableMessengers(): Promise<MessengerChannel[]> {
    const kinds = await this.registry.available();
    return AVAILABLE_MESSENGERS.filter((name) => kinds.includes(MESSENGER_KIND[name]));
  }

  /**
   * Отказ провайдера не показываем гостю: ему нужен понятный следующий шаг,
   * а не текст валидации Zvonok. Детали уходят в лог и в журнал для админки.
   */
  private async deliveryFailure(
    err: unknown,
    phone: string,
    channel: OtpChannel,
  ): Promise<never> {
    if (channel === 'telegram' || channel === 'max') {
      const providerMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `OTP delivery failed for ${maskPhone(phone)} via ${channel}: ${providerMessage}`,
      );
      await this.recordIncident(phone, channel, `send: ${providerMessage}`);
      throw new ServiceUnavailableException(
        `Не удалось отправить код в ${otpChannelLabel(channel)}. ` +
          'Проверьте, что номер привязан к мессенджеру, или повторите звонок.',
      );
    }

    if (!(err instanceof ZvonokDeliveryError)) {
      this.logger.error(
        `OTP delivery crashed for ${maskPhone(phone)} via ${channel}: ${
          err instanceof Error ? err.stack || err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException(DELIVERY_OUTAGE_TEXT);
    }

    this.logger.error(
      `OTP delivery failed for ${maskPhone(phone)} via ${channel}: ${err.kind} — ${err.providerMessage}`,
    );
    await this.recordIncident(phone, channel, `${err.kind}: ${err.providerMessage}`);

    if (err.kind === 'bad-phone') {
      throw new BadRequestException(
        'Не удалось отправить код на этот номер. Проверьте номер и попробуйте ещё раз.',
      );
    }
    if (err.kind === 'rate-limit') {
      throw new HttpException(
        'Слишком много запросов к телефонии. Попробуйте через пару минут.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new ServiceUnavailableException(DELIVERY_OUTAGE_TEXT);
  }

  private async recordIncident(
    phone: string,
    channel: OtpChannel,
    detail: string,
  ): Promise<void> {
    const provider = channel === 'telegram' || channel === 'max' ? 'wazzup' : 'zvonok';
    try {
      await this.prisma.notificationLog.create({
        data: {
          channel: provider,
          template: 'otp-delivery-failed',
          recipient: maskPhone(phone),
          status: 'failed',
          errorText: `${channel}/${detail}`.slice(0, 2000),
        },
      });
    } catch (dbErr) {
      // Журнал не должен подменять исходную ошибку доставки
      this.logger.warn(
        `Не удалось записать сбой доставки кода: ${
          dbErr instanceof Error ? dbErr.message : String(dbErr)
        }`,
      );
    }
  }

  /** Возвращает число секунд до следующей отправки либо 0. */
  private async checkLimits(phone: string, ip: string | null, now: number): Promise<number> {
    const sinceResend = new Date(now - RESEND_COOLDOWN_SEC * 1000);
    const sinceHour = new Date(now - 60 * 60 * 1000);
    const sinceDay = new Date(now - 24 * 60 * 60 * 1000);

    const [lastSent, inHour, inDay, ipInDay] = await Promise.all([
      this.prisma.otpCode.findFirst({
        where: { phone, sentAt: { gte: sinceResend } },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      }),
      this.prisma.otpCode.count({ where: { phone, sentAt: { gte: sinceHour } } }),
      this.prisma.otpCode.count({ where: { phone, sentAt: { gte: sinceDay } } }),
      ip
        ? this.prisma.otpCode.count({ where: { ip, sentAt: { gte: sinceDay } } })
        : Promise.resolve(0),
    ]);

    if (inHour >= LIMIT_PER_HOUR) {
      throw new BadRequestException('Слишком много запросов кода. Повторите позже.');
    }
    if (inDay >= LIMIT_PER_DAY) {
      throw new BadRequestException('Дневной лимит кодов на этот номер исчерпан.');
    }
    if (ip && ipInDay >= LIMIT_IP_PER_DAY) {
      this.logger.warn(`OTP IP limit reached for ${ip}`);
      throw new BadRequestException('Превышен лимит запросов кода. Повторите завтра.');
    }

    if (!lastSent) return 0;
    const elapsed = (now - lastSent.sentAt.getTime()) / 1000;
    return Math.max(1, Math.ceil(RESEND_COOLDOWN_SEC - elapsed));
  }

  async verifyAndConsume(rawPhone: string, code: string): Promise<void> {
    const phone = normalizePhone(rawPhone);

    const row = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { sentAt: 'desc' },
    });

    if (!row) {
      throw new UnauthorizedException('Код не отправлен или истёк. Запросите новый.');
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await this.prisma.otpCode.delete({ where: { id: row.id } });
      throw new UnauthorizedException('Код заблокирован после пяти неверных попыток. Запросите новый.');
    }

    const matched = await bcrypt.compare(code, row.codeHash);
    if (!matched) {
      await this.prisma.otpCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      const left = MAX_ATTEMPTS - row.attempts - 1;
      throw new UnauthorizedException(
        left > 0 ? `Неверный код. Осталось попыток: ${left}.` : 'Неверный код. Запросите новый.',
      );
    }

    await this.prisma.otpCode.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
  }
}
