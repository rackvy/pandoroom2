import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Add a client to the waitlist for a specific quest */
  async addToWaitlist(data: {
    questId: string;
    clientName: string;
    clientPhone: string;
    desiredDate?: string;
    desiredTime?: string;
  }) {
    // Verify quest exists
    const quest = await this.prisma.quest.findUnique({
      where: { id: data.questId },
      include: { branch: true },
    });
    if (!quest) throw new NotFoundException('Квест не найден');

    // Calculate position
    const count = await this.prisma.waitlistEntry.count({
      where: { questId: data.questId, status: 'waiting' },
    });

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        questId: data.questId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        desiredDate: data.desiredDate ? new Date(data.desiredDate) : null,
        desiredTime: data.desiredTime || null,
        position: count + 1,
      },
    });

    // Enqueue confirmation notification
    await this.notifications.enqueue({
      templateKey: 'WAITLIST_JOINED',
      variables: {
        clientName: data.clientName,
        questName: quest.name,
      },
      channel: 'sms',
      recipient: data.clientPhone,
      waitlistId: entry.id,
    });

    return entry;
  }

  /** Get all waiting entries for a quest (admin) */
  async getWaitlist(questId?: string, status?: string) {
    const where: any = {};
    if (questId) where.questId = questId;
    if (status) where.status = status;

    return this.prisma.waitlistEntry.findMany({
      where,
      include: { quest: { select: { name: true } } },
      orderBy: [{ questId: 'asc' }, { position: 'asc' }],
    });
  }

  /** Notify next person in waitlist when a slot becomes free */
  async notifyNextInQueue(questId: string, eventDate?: Date, time?: string) {
    // Find the first waiting entry matching the quest and optionally the date/time
    const where: any = {
      questId,
      status: 'waiting',
    };

    // Prefer entries that want this specific date/time
    let entry = null;
    if (eventDate && time) {
      const dateStr = eventDate.toISOString().split('T')[0];
      entry = await this.prisma.waitlistEntry.findFirst({
        where: { ...where, desiredDate: eventDate, desiredTime: time },
        orderBy: { position: 'asc' },
        include: { quest: { include: { branch: true } } },
      });
    }

    // Fallback: any waiting entry for this quest
    if (!entry) {
      entry = await this.prisma.waitlistEntry.findFirst({
        where,
        orderBy: { position: 'asc' },
        include: { quest: { include: { branch: true } } },
      });
    }

    if (!entry) {
      this.logger.log(`No waitlist entries for quest ${questId}`);
      return null;
    }

    const quest = entry.quest as any;
    const eventDateStr = eventDate
      ? eventDate.toLocaleDateString('ru-RU')
      : 'ближайшая дата';
    const timeStr = time || 'любое время';

    // Enqueue notification about freed slot
    await this.notifications.enqueue({
      templateKey: 'WAITLIST_SLOT_FREED',
      variables: {
        clientName: entry.clientName,
        questName: quest.name,
        eventDate: eventDateStr,
        time: timeStr,
        branchPhone: quest.branch?.phone || '',
      },
      channel: 'sms',
      recipient: entry.clientPhone,
      waitlistId: entry.id,
    });

    // Mark as notified
    await this.prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'notified', notifiedAt: new Date() },
    });

    this.logger.log(`Notified ${entry.clientName} (${entry.clientPhone}) about freed slot for ${quest.name}`);
    return entry;
  }

  /** Update waitlist entry status (admin) */
  async updateStatus(id: string, status: string) {
    return this.prisma.waitlistEntry.update({
      where: { id },
      data: { status },
    });
  }

  /** Remove from waitlist */
  async removeFromWaitlist(id: string) {
    await this.prisma.waitlistEntry.delete({ where: { id } });
    return { message: 'Запись удалена из листа ожидания' };
  }
}
