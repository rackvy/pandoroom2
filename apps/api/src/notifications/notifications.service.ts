import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramChannel } from './channels/telegram.channel';
import { SmsChannel } from './channels/sms.channel';
import { MaxChannel } from './channels/max.channel';
import { renderTemplate } from './templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramChannel,
    private sms: SmsChannel,
    private max: MaxChannel,
  ) {}

  async send(bookingId: string, templateKey: string, channel: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, branch: true },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    const variables: Record<string, string> = {
      clientName: booking.clientName,
      eventDate: booking.eventDate.toLocaleDateString('ru-RU'),
      branchPhone: booking.branch.phone || '',
    };
    const text = renderTemplate(templateKey, variables);

    let recipient = '';
    let result: { success: boolean; error?: string };

    switch (channel) {
      case 'telegram':
        recipient = booking.client?.telegramChatId || '';
        if (!recipient) {
          return { success: false, error: 'У клиента не указан Telegram chat_id' };
        }
        result = await this.telegram.send(recipient, text);
        break;
      case 'sms':
        recipient = booking.clientPhone;
        result = await this.sms.send(recipient, text);
        break;
      case 'max':
        recipient = booking.client?.maxChatId || '';
        if (!recipient) {
          return { success: false, error: 'У клиента не указан MAX chat_id' };
        }
        result = await this.max.send(recipient, text);
        break;
      default:
        return { success: false, error: `Неизвестный канал: ${channel}` };
    }

    // Log notification
    await this.prisma.notificationLog.create({
      data: {
        bookingId,
        channel,
        template: templateKey,
        recipient,
        status: result.success ? 'sent' : 'failed',
        errorText: result.error || null,
      },
    });

    return result;
  }

  async getLogsByBooking(bookingId: string) {
    return this.prisma.notificationLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
