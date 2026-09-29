import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ZvonokService } from '../zvonok/zvonok.service';
import { isValidPhone, normalizePhone, toMsisdn } from './phone';

export type OtpChannel = 'call' | 'sms';

const CODE_TTL_SEC = 300;
const RESEND_COOLDOWN_SEC = 60;
const LIMIT_PER_HOUR = 5;
const LIMIT_PER_DAY = 20;
const LIMIT_IP_PER_DAY = 20;
const MAX_ATTEMPTS = 5;

export interface OtpSendResult {
  sent: true;
  channel: OtpChannel;
  expiresInSec: number;
  retryAfterSec: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private zvonok: ZvonokService,
  ) {}

  /** Публично: какие способы доставки кода сейчас реально настроены. */
  async channels(): Promise<{ channels: OtpChannel[] }> {
    const cfg = await this.zvonok.config();
    const channels: OtpChannel[] = [];
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
    // Сначала доставка: если Zvonok отказал, кода в базе быть не должно
    const delivered =
      channel === 'sms'
        ? await this.zvonok.sendCodeBySms(toMsisdn(phone), code)
        : await this.zvonok.sendCodeByCall(toMsisdn(phone), code);

    await this.prisma.$transaction([
      this.prisma.otpCode.deleteMany({ where: { phone, consumedAt: null } }),
      this.prisma.otpCode.create({
        data: {
          phone,
          codeHash: await bcrypt.hash(delivered.pincode, 10),
          channel,
          ip,
          expiresAt: new Date(now + CODE_TTL_SEC * 1000),
        },
      }),
    ]);

    this.logger.log(`OTP sent to ${phone} via ${channel} (call ${delivered.callId ?? 'n/a'})`);
    return { sent: true, channel, expiresInSec: CODE_TTL_SEC, retryAfterSec: RESEND_COOLDOWN_SEC };
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
