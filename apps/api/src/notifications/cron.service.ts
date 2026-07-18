import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Every day at 10:00 AM — send reminders for tomorrow's bookings
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendBookingReminders() {
    this.logger.log('Starting daily booking reminders...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Find all confirmed bookings for tomorrow
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventDate: { gte: tomorrow, lte: tomorrowEnd },
        status: { in: ['confirmed', 'draft'] },
      },
      include: {
        branch: true,
        questReservations: {
          include: { quest: true },
        },
      },
    });

    for (const booking of bookings) {
      // Get first quest reservation for time info
      const reservation = booking.questReservations[0];
      const questName = reservation?.quest?.name || 'ваше бронирование';
      const time = reservation
        ? `${String(reservation.startTime.getHours()).padStart(2, '0')}:${String(reservation.startTime.getMinutes()).padStart(2, '0')}`
        : '—';

      try {
        await this.notifications.enqueue({
          templateKey: 'BOOKING_REMINDER_24H',
          variables: {
            clientName: booking.clientName,
            questName,
            time,
            address: booking.branch.address || '',
            branchPhone: booking.branch.phone || '',
          },
          channel: 'sms',
          recipient: booking.clientPhone,
          bookingId: booking.id,
        });
        this.logger.log(`Reminder queued for ${booking.clientName} — ${questName} at ${time}`);
      } catch (err) {
        this.logger.error(`Failed to queue reminder for booking ${booking.id}: ${err}`);
      }
    }

    this.logger.log(`Processed ${bookings.length} reminders`);
  }

  /**
   * Every hour — expire waitlist entries older than 7 days without activity
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireWaitlistEntries() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const expired = await this.prisma.waitlistEntry.updateMany({
      where: {
        status: 'notified',
        notifiedAt: { lt: sevenDaysAgo },
      },
      data: { status: 'expired' },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} waitlist entries`);
    }
  }
}
