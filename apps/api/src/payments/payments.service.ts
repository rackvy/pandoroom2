import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createPaymentLink(bookingId: string, amount: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    const terminalKey = this.configService.get<string>('TBANK_TERMINAL_KEY');
    const password = this.configService.get<string>('TBANK_PASSWORD');
    const apiUrl = this.configService.get<string>('TBANK_API_URL', 'https://securepay.tinkoff.ru/v2');
    const successUrl = this.configService.get<string>('PAYMENT_SUCCESS_URL', 'https://pandoroom.e-rma.ru/payment/success');
    const failUrl = this.configService.get<string>('PAYMENT_FAIL_URL', 'https://pandoroom.e-rma.ru/payment/fail');

    if (!terminalKey || !password) {
      // Stub mode
      const stubPaymentId = `stub-${Date.now()}`;
      const stubUrl = `${successUrl}?stub=true&orderId=${bookingId}`;

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

    // Real TBank Init
    const params: Record<string, any> = {
      TerminalKey: terminalKey,
      Amount: Math.round(amount * 100), // копейки
      OrderId: bookingId,
      Description: `Бронирование Pandoroom #${bookingId.slice(0, 8)}`,
      SuccessURL: successUrl,
      FailURL: failUrl,
    };

    // Sign: sort params, concatenate values + password, SHA-256
    const sortedKeys = Object.keys(params).sort();
    const values = sortedKeys.map(k => String(params[k])).join('');
    params.Token = createHash('sha256').update(values + password).digest('hex');

    const response = await fetch(`${apiUrl}/Init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!data.Success) {
      this.logger.error(`TBank Init failed: ${data.Message}`);
      return { paymentUrl: null, paymentId: null, error: data.Message };
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: 'pending',
        paymentId: data.PaymentId?.toString(),
        paymentUrl: data.PaymentURL,
      },
    });

    return { paymentUrl: data.PaymentURL, paymentId: data.PaymentId?.toString() };
  }

  async getPaymentStatus(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true, paymentId: true, paymentUrl: true, paidAt: true, depositRub: true, paymentMethod: true },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');
    return booking;
  }

  async handleWebhook(body: any) {
    this.logger.log(`TBank webhook received: ${JSON.stringify(body)}`);

    const orderId = body.OrderId;
    const status = body.Status;

    if (!orderId) return { ok: false, error: 'No OrderId' };

    const updateData: any = {};
    switch (status) {
      case 'CONFIRMED':
        updateData.paymentStatus = 'paid';
        updateData.paidAt = new Date();
        break;
      case 'REJECTED':
        updateData.paymentStatus = 'failed';
        break;
      case 'REFUNDED':
        updateData.paymentStatus = 'refunded';
        break;
      default:
        updateData.paymentStatus = status?.toLowerCase();
    }

    await this.prisma.booking.update({
      where: { id: orderId },
      data: updateData,
    });

    return { ok: true };
  }
}
