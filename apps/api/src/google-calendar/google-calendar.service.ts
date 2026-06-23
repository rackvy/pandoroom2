import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private enabled = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get<string>('GOOGLE_CALENDAR_ENABLED', 'false') === 'true';
  }

  async syncBookingToCalendar(bookingId: string): Promise<{ googleEventId: string; url: string | null }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { branch: true, tableSlots: true, questSlots: true },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    if (!this.enabled) {
      this.logger.log('[STUB] Google Calendar sync disabled');
      const stubEventId = `stub-event-${Date.now()}`;
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { googleEventId: stubEventId },
      });
      return { googleEventId: stubEventId, url: null };
    }

    // Build event data
    const summary = `Бронь: ${booking.clientName} (${(booking.guestsKids || 0) + (booking.guestsAdults || 0)} чел.)`;
    const descriptionParts = [
      `Клиент: ${booking.clientName} (${booking.clientPhone})`,
      booking.questSlots.length > 0 ? `Квесты: ${booking.questSlots.map(q => q.title).join(', ')}` : null,
      booking.tableSlots.length > 0 ? `Столы: ${booking.tableSlots.map(t => t.title).join(', ')}` : null,
      booking.commentClient ? `Комментарий: ${booking.commentClient}` : null,
    ].filter(Boolean);

    // Get earliest start and latest end from slots
    // Note: questSlots only have startTime (no endTime), tableSlots have both
    const allStarts = [
      ...booking.tableSlots.map(s => s.startTime),
      ...booking.questSlots.map(s => s.startTime),
    ];
    const allEnds = [
      ...booking.tableSlots.map(s => s.endTime),
    ];

    const eventDate = booking.eventDate.toISOString().split('T')[0];
    const startTime = allStarts.length > 0
      ? new Date(Math.min(...allStarts.map(d => d.getTime()))).toISOString().split('T')[1].slice(0, 5)
      : '10:00';
    const endTime = allEnds.length > 0
      ? new Date(Math.max(...allEnds.map(d => d.getTime()))).toISOString().split('T')[1].slice(0, 5)
      : '22:00';

    // Real implementation would use googleapis library here
    // For now, stub with proper logging
    const eventId = `event-${bookingId.slice(0, 8)}-${Date.now()}`;
    this.logger.log(`[STUB] Would create event: ${summary} on ${eventDate} ${startTime}-${endTime}`);
    void descriptionParts;

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { googleEventId: eventId },
    });

    return { googleEventId: eventId, url: null };
  }

  async deleteCalendarEvent(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking?.googleEventId) return;

    if (!this.enabled) {
      this.logger.log(`[STUB] Would delete event: ${booking.googleEventId}`);
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { googleEventId: null },
      });
      return;
    }

    // Real implementation would delete via Google Calendar API
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { googleEventId: null },
    });
  }

  async syncAllByDate(date: string): Promise<{ synced: number }> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventDate: new Date(date),
        status: { not: 'canceled' },
      },
    });

    let synced = 0;
    for (const booking of bookings) {
      try {
        await this.syncBookingToCalendar(booking.id);
        synced++;
      } catch (err) {
        this.logger.error(`Failed to sync booking ${booking.id}: ${err}`);
      }
    }

    return { synced };
  }
}
