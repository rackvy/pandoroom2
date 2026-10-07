import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ReservationStatus, BookingType } from '@prisma/client';
import { normalizePhone } from '../client-auth/phone';
import {
  DEFAULT_PARTY_DURATION_MINUTES,
  DAY_END_MINUTES,
  addMinutesToSlotDate,
  endMinutesOfDay,
  slotDateToHHMM,
  slotDateToMinutes,
  stringToSlotDate,
} from '../common/slot-time';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';

const BOOKING_TYPES = Object.values(BookingType);

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
    private waitlistService: WaitlistService,
    private notifications: NotificationsService,
  ) {}

  async findAll(filters?: { branchId?: string; dateFrom?: string; dateTo?: string; type?: string }) {
    const where: any = {};

    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters?.type) {
      if (!BOOKING_TYPES.includes(filters.type as BookingType)) {
        throw new BadRequestException(`Неизвестный тип брони: ${filters.type}`);
      }
      where.type = filters.type;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.eventDate = {};
      if (filters.dateFrom) {
        where.eventDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.eventDate.lte = new Date(filters.dateTo);
      }
    }
    
    return this.prisma.booking.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      include: {
        branch: true,
        manager: {
          select: { id: true, fullName: true, email: true },
        },
        tableSlots: true,
        questSlots: { include: { quest: true } },
        extraSlots: true,
        bookingCakes: { include: { cake: true } },
        decorationItems: { include: { decoration: true } },
        foodItems: true,
        // Реестр показывает занятость, а не только состав заявки: без этих
        // отношений колонки «время / зал / стол / квест / VR» пустые.
        tableReservations: {
          include: { table: { include: { zone: true } } },
          orderBy: { startTime: 'asc' },
        },
        questReservations: {
          include: { quest: true },
          orderBy: { startTime: 'asc' },
        },
        vrReservations: {
          include: { hall: true },
          orderBy: { startTime: 'asc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        branch: true,
        manager: {
          select: { id: true, fullName: true, email: true },
        },
        tableSlots: true,
        questSlots: { include: { quest: true } },
        extraSlots: true,
        bookingCakes: { include: { cake: true } },
        decorationItems: { include: { decoration: true } },
        foodItems: true,
      },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');
    return booking;
  }

  async findOneWithReservations(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        branch: true,
        manager: {
          select: { id: true, fullName: true, email: true },
        },
        tableSlots: true,
        questSlots: { include: { quest: true } },
        extraSlots: true,
        bookingCakes: { include: { cake: true } },
        decorationItems: { include: { decoration: true } },
        foodItems: true,
        tableReservations: {
          include: { table: { include: { zone: true } } },
          orderBy: { startTime: 'asc' },
        },
        questReservations: {
          include: { quest: true },
          orderBy: { startTime: 'asc' },
        },
      },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');
    return booking;
  }

  async findByDate(date: Date) {
    return this.prisma.booking.findMany({
      where: { eventDate: date },
      include: {
        branch: true,
        manager: {
          select: { id: true, fullName: true },
        },
        tableSlots: true,
        questSlots: { include: { quest: true } },
      },
    });
  }

  async create(data: CreateBookingDto) {
    const eventDate = new Date(data.eventDate);
    if (Number.isNaN(eventDate.getTime())) throw new BadRequestException('Некорректная дата');
    eventDate.setHours(0, 0, 0, 0);

    const clientPhone = data.clientPhone ? normalizePhone(data.clientPhone) : '';
    const clientName = (data.clientName || '').trim();

    const tables = await this.resolveRequestedTables(data.tableIds, data.branchId);
    const quests = await this.resolveRequestedQuests(data.questIds, data.branchId);
    if ((tables.length || quests.length) && !data.startTime) {
      throw new BadRequestException('Укажите время начала — по нему подобраны столы и квесты');
    }

    let clientId: string | null = data.clientId ?? null;
    if (!clientId && clientPhone && clientName) {
      const client = await this.clientsService.getOrCreate(clientPhone, clientName);
      clientId = client.id;
    }

    let eventWindow: { startTime: Date; endTime: Date } | null = null;
    if (data.startTime) {
      try {
        const startTime = stringToSlotDate(data.startTime);
        eventWindow = {
          startTime,
          endTime: addMinutesToSlotDate(startTime, DEFAULT_PARTY_DURATION_MINUTES),
        };
      } catch {
        throw new BadRequestException('Некорректное время, нужен формат ЧЧ:ММ');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          branchId: data.branchId,
          clientId,
          eventDate,
          clientName,
          clientPhone,
          type: data.type ?? 'party',
          status: data.status ?? 'draft',
          depositRub: data.depositRub ?? 0,
          paymentMethod: data.paymentMethod ?? null,
          birthdayPersonName: (data.birthdayPersonName || '').trim() || null,
          birthdayPersonAge: data.birthdayPersonAge ?? null,
          guestsKids: data.guestsKids ?? null,
          guestsAdults: data.guestsAdults ?? null,
          commentClient: (data.commentClient || '').trim() || null,
          commentInternal: (data.commentInternal || '').trim() || null,
        },
      });

      if (eventWindow) {
        for (const table of tables) {
          await tx.bookingTableSlot.create({
            data: {
              bookingId: booking.id,
              tableId: table.id,
              title: `${table.zone?.name || ''} ${table.title}`.trim(),
              startTime: eventWindow.startTime,
              endTime: eventWindow.endTime,
            },
          });
        }

        for (const quest of quests) {
          await tx.bookingQuestSlot.create({
            data: {
              bookingId: booking.id,
              questId: quest.id,
              title: quest.name,
              startTime: eventWindow.startTime,
            },
          });
        }
      }

      return booking;
    });

    return this.prisma.booking.findUnique({
      where: { id: created.id },
      include: {
        branch: true,
        manager: { select: { id: true, fullName: true, email: true } },
        tableSlots: true,
        questSlots: { include: { quest: true } },
      },
    });
  }

  private async resolveRequestedTables(tableIds?: string[], branchId?: string) {
    const ids = [...new Set((tableIds ?? []).filter(Boolean))];
    if (!ids.length) return [];

    const found = await this.prisma.table.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { zone: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Часть выбранных столов больше недоступна — обновите список');
    }

    const foreign = found.find((table) => table.branchId !== branchId);
    if (foreign) {
      throw new BadRequestException('Стол выбран в другом филиале — бронь оформляется на один филиал');
    }

    return ids.map((id) => found.find((table) => table.id === id)!);
  }

  private async resolveRequestedQuests(questIds?: string[], branchId?: string) {
    const ids = [...new Set((questIds ?? []).filter(Boolean))];
    if (!ids.length) return [];

    const found = await this.prisma.quest.findMany({ where: { id: { in: ids } } });
    if (found.length !== ids.length) {
      throw new BadRequestException('Часть выбранных квестов больше недоступна — обновите список');
    }

    const foreign = found.find((quest) => quest.branchId !== branchId);
    if (foreign) {
      throw new BadRequestException(
        `Квест «${foreign.name}» в другом филиале — стол и квест нужно выбрать в одном филиале`,
      );
    }

    return ids.map((id) => found.find((quest) => quest.id === id)!);
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.booking.update({
      where: { id },
      data,
      include: {
        branch: true,
        manager: { select: { id: true, fullName: true, email: true } },
        tableSlots: true,
        questSlots: { include: { quest: true } },
        extraSlots: true,
        bookingCakes: { include: { cake: true } },
        decorationItems: { include: { decoration: true } },
        foodItems: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.booking.delete({ where: { id } });
    return { message: 'Бронирование удалено' };
  }

  // ==================== FULL DETAILS ====================

  async findOneFull(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        branch: true,
        manager: {
          select: { id: true, fullName: true, email: true },
        },
        tableSlots: {
          include: { table: { include: { zone: true } } },
          orderBy: { startTime: 'asc' },
        },
        questSlots: { include: { quest: true }, orderBy: { startTime: 'asc' } },
        tableReservations: {
          include: { table: { include: { zone: true } } },
          orderBy: { startTime: 'asc' },
        },
        questReservations: {
          include: { quest: true },
          orderBy: { startTime: 'asc' },
        },
        vrReservations: {
          include: { hall: true },
          orderBy: { startTime: 'asc' },
        },
        extraSlots: true,
        bookingCakes: { include: { cake: true } },
        decorationItems: { include: { decoration: true } },
        foodItems: true,
      },
    });

    if (!booking) throw new NotFoundException('Бронирование не найдено');

    // Колонки @db.Time хранят только время, поэтому читаем его в UTC: локальный
    // часовой пояс процесса сдвинул бы все слоты на разницу с UTC.
    const formatTime = (date: Date) => date.toISOString().slice(11, 16);
    const optionalTime = (date: Date | null) => (date ? formatTime(date) : null);

    return {
      id: booking.id,
      status: booking.status,
      type: booking.type,
      eventDate: booking.eventDate.toISOString().split('T')[0],
      clientId: booking.clientId,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      birthdayPersonName: booking.birthdayPersonName,
      birthdayPersonAge: booking.birthdayPersonAge,
      guestsKids: booking.guestsKids,
      guestsAdults: booking.guestsAdults,
      depositRub: booking.depositRub,
      commentClient: booking.commentClient,
      commentInternal: booking.commentInternal,
      managerId: booking.managerId,
      manager: booking.manager,
      branch: booking.branch,
      googleEventId: booking.googleEventId,
      iikoOrderId: booking.iikoOrderId,
      iikoOrderStatus: booking.iikoOrderStatus,
      // Запрошенный состав заявки: подтверждение переносит его в занятость.
      tableSlots: booking.tableSlots.map((slot) => ({
        id: slot.id,
        tableId: slot.tableId,
        tableTitle: slot.table?.title ?? null,
        zoneName: slot.table?.zone?.name ?? null,
        title: slot.title,
        startTime: formatTime(slot.startTime),
        endTime: formatTime(slot.endTime),
      })),
      questSlots: booking.questSlots.map((slot) => ({
        id: slot.id,
        questId: slot.questId,
        questName: slot.quest?.name ?? null,
        title: slot.title,
        startTime: formatTime(slot.startTime),
      })),
      tableReservations: booking.tableReservations.map(r => ({
        id: r.id,
        tableId: r.tableId,
        tableTitle: r.table?.title,
        zoneName: r.table?.zone?.name,
        startTime: formatTime(r.startTime),
        endTime: formatTime(r.endTime),
        status: r.status,
        title: r.title,
      })),
      questReservations: booking.questReservations.map(r => ({
        id: r.id,
        questId: r.questId,
        questName: r.quest?.name,
        startTime: formatTime(r.startTime),
        endTime: formatTime(r.endTime),
        status: r.status,
        title: r.title,
        animatorName: r.animatorName,
        extraPlayers: r.extraPlayers,
        extraPlayersPrice: r.extraPlayersPrice,
      })),
      vrReservations: booking.vrReservations.map((r) => ({
        id: r.id,
        hallId: r.hallId,
        hallName: r.hall?.name ?? null,
        startTime: formatTime(r.startTime),
        endTime: formatTime(r.endTime),
        type: r.type,
        status: r.status,
        title: r.title,
        guestsCount: r.guestsCount,
      })),
      extraSlots: booking.extraSlots.map((slot) => ({
        id: slot.id,
        type: slot.type,
        title: slot.title,
        priceRub: slot.priceRub,
        startTime: optionalTime(slot.startTime),
        endTime: optionalTime(slot.endTime),
        comment: slot.comment,
      })),
      bookingCakes: booking.bookingCakes.map((item) => ({
        id: item.id,
        cakeId: item.cakeId,
        cakeName: item.cake?.name ?? item.title,
        weightKg: item.cake ? Math.round(item.cake.weightGrams / 100) / 10 : null,
        inscription: item.inscription,
        priceRub: item.priceRub,
        comment: item.comment,
      })),
      decorationItems: booking.decorationItems.map((item) => ({
        id: item.id,
        decorationId: item.decorationId,
        decorationName: item.decoration?.name ?? item.title,
        quantity: item.qty,
        priceRub: item.priceRub,
        comment: item.comment,
      })),
      foodItems: booking.foodItems.map((item) => ({
        id: item.id,
        menuItemId: item.iikoItemId,
        menuItemName: item.title,
        quantity: item.qty,
        priceRub: item.priceRub,
        servingTime: optionalTime(item.serveAt),
        department: item.department,
        comment: item.comment,
      })),
    };
  }

  // ==================== BASIC UPDATE ====================

  async updateBasic(id: string, data: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        tableReservations: true,
        questReservations: true,
      },
    });

    if (!booking) throw new NotFoundException('Бронирование не найдено');

    // Get or create client if phone provided
    let clientId: string | undefined = undefined;
    const clientPhone = data.clientPhone ? normalizePhone(data.clientPhone) : data.clientPhone;
    if (clientPhone && data.clientName) {
      const client = await this.clientsService.getOrCreate(clientPhone, data.clientName);
      clientId = client.id;
    }

    // Update booking
    const optionalNumber = (value: unknown) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    };

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        clientName: data.clientName,
        clientPhone,
        clientId: clientId,
        depositRub: data.depositRub,
        status: data.status,
        birthdayPersonName: data.birthdayPersonName,
        birthdayPersonAge: optionalNumber(data.birthdayPersonAge),
        guestsKids: optionalNumber(data.guestsKids),
        guestsAdults: optionalNumber(data.guestsAdults),
        commentClient: data.commentClient,
        commentInternal: data.commentInternal,
        managerId: data.managerId,
      },
    });

    // Sync title to reservations if clientName changed and reservation is draft with default title
    if (data.clientName !== undefined) {
      const newTitle = data.clientName?.trim() || 'Новая бронь';
      
      // Update table reservations
      for (const res of booking.tableReservations) {
        if (res.status === 'draft' && res.title === 'Новая бронь') {
          await this.prisma.tableReservation.update({
            where: { id: res.id },
            data: { title: newTitle },
          });
        }
      }

      // Update quest reservations
      for (const res of booking.questReservations) {
        if (res.status === 'draft' && res.title === 'Новая бронь') {
          await this.prisma.questReservation.update({
            where: { id: res.id },
            data: { title: newTitle },
          });
        }
      }
    }

    return updated;
  }

  // ==================== TABLE SLOTS ====================
  async addTableSlot(bookingId: string, data: any) {
    // Get table info for title
    const table = await this.prisma.table.findUnique({
      where: { id: data.tableId },
      include: { zone: true },
    });
    
    const title = table ? `${table.zone?.name || ''} ${table.title}`.trim() : 'Стол';
    
    // Parse time strings to Date objects
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHours, endMinutes, 0, 0);
    
    return this.prisma.bookingTableSlot.create({
      data: {
        bookingId,
        tableId: table?.id ?? null,
        title,
        startTime,
        endTime,
        comment: data.comment || null,
      },
    });
  }

  async removeTableSlot(id: string) {
    await this.prisma.bookingTableSlot.delete({ where: { id } });
    return { message: 'Слот стола удален' };
  }

  // ==================== QUEST SLOTS ====================
  async addQuestSlot(bookingId: string, data: any) {
    // Get quest info for title
    const quest = data.questId ? await this.prisma.quest.findUnique({
      where: { id: data.questId },
    }) : null;
    
    const title = quest ? quest.name : 'Квест';
    
    // Parse time string to Date object
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);
    
    return this.prisma.bookingQuestSlot.create({
      data: {
        bookingId,
        questId: data.questId || null,
        title,
        startTime,
        comment: data.comment || null,
        animatorName: data.animatorName || null,
      },
      include: { quest: true },
    });
  }

  async removeQuestSlot(id: string) {
    await this.prisma.bookingQuestSlot.delete({ where: { id } });
    return { message: 'Слот квеста удален' };
  }

  // ==================== QUEST RESERVATIONS ====================
  async addQuestReservation(bookingId: string, data: any) {
    // Get booking for branchId and eventDate
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    // Get quest for duration and branchId
    const quest = await this.prisma.quest.findUnique({ where: { id: data.questId } });
    if (!quest) throw new NotFoundException('Квест не найден');

    // Validate extra players
    const maxExtra = quest.maxExtraPlayers || 0;
    const requestedExtra = Math.max(0, data.extraPlayers || 0);
    if (requestedExtra > maxExtra) {
      throw new BadRequestException(`Максимум ${maxExtra} доп. участник(ов) для этого квеста`);
    }

    // Parse times
    const eventDate = new Date(booking.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const [hours, minutes] = (data.startTime || '12:00').split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);
    const duration = data.durationMinutes || quest.durationMinutes;
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Calculate extras
    const extraPlayers = Math.max(0, data.extraPlayers || 0);
    const extraPlayersPrice = extraPlayers * (quest.extraPlayerPrice || 0);
    const addAnimator = data.addAnimator && quest.allowAnimator;

    return this.prisma.questReservation.create({
      data: {
        bookingId,
        clientId: booking.clientId,
        branchId: quest.branchId,
        questId: data.questId,
        eventDate,
        startTime,
        endTime,
        title: data.title || `${booking.clientName || 'Бронь'} — ${quest.name} ${data.startTime}`,
        status: 'confirmed',
        animatorName: addAnimator ? (data.animatorName || 'Аниматор') : null,
        extraPlayers,
        extraPlayersPrice,
      },
      include: { quest: true },
    });
  }

  async removeQuestReservation(id: string) {
    // Get reservation details before removing
    const reservation = await this.prisma.questReservation.findUnique({
      where: { id },
      include: { booking: true, quest: true },
    });

    await this.prisma.questReservation.delete({ where: { id } });

    if (reservation) {
      const timeStr = `${String(reservation.startTime.getHours()).padStart(2, '0')}:${String(reservation.startTime.getMinutes()).padStart(2, '0')}`;

      // Notify client about cancellation
      if (reservation.booking.clientPhone) {
        const branch = await this.prisma.branch.findUnique({ where: { id: reservation.branchId } });
        await this.notifications.enqueue({
          templateKey: 'BOOKING_CANCELLED',
          variables: {
            clientName: reservation.booking.clientName,
            questName: reservation.quest?.name || 'Квест',
            eventDate: reservation.eventDate.toLocaleDateString('ru-RU'),
            time: timeStr,
            branchPhone: branch?.phone || '',
          },
          channel: 'sms',
          recipient: reservation.booking.clientPhone,
          bookingId: reservation.bookingId,
        });
      }

      // Notify next person in waitlist
      try {
        await this.waitlistService.notifyNextInQueue(reservation.questId, reservation.eventDate, timeStr);
      } catch (err) {
        this.logger.warn(`Failed to notify waitlist for quest ${reservation.questId}: ${err}`);
      }
    }

    return { message: 'Резервация квеста удалена' };
  }

  // ==================== TABLE RESERVATIONS ====================
  /**
   * Стол к уже созданной брони: занятость появляется сразу, с проверкой
   * пересечений и буфера уборки — как в быстрой брони сетки столов.
   */
  async addTableReservation(
    bookingId: string,
    data: { tableId: string; startTime: string; endTime?: string; comment?: string },
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    const table = await this.prisma.table.findUnique({
      where: { id: data.tableId },
      include: { zone: true },
    });
    if (!table) throw new NotFoundException('Стол не найден');

    let startTime: Date;
    let endTime: Date;
    try {
      startTime = stringToSlotDate(data.startTime);
      endTime = data.endTime
        ? stringToSlotDate(data.endTime)
        : addMinutesToSlotDate(startTime, DEFAULT_PARTY_DURATION_MINUTES);
    } catch {
      throw new BadRequestException('Некорректное время, нужен формат ЧЧ:ММ');
    }
    if (data.endTime && slotDateToMinutes(endTime) < slotDateToMinutes(startTime)) {
      throw new BadRequestException('Время окончания должно быть позже начала');
    }

    const eventDate = new Date(booking.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const conflicts = await this.tableConflictMessages(eventDate, [
      {
        tableId: table.id,
        title: `${table.zone?.name || ''} ${table.title}`.trim(),
        startMinutes: slotDateToMinutes(startTime),
        endMinutes: endMinutesOfDay(endTime, startTime),
      },
    ]);
    if (conflicts.length) throw new BadRequestException(conflicts.join('; '));

    return this.prisma.tableReservation.create({
      data: {
        bookingId,
        branchId: booking.branchId,
        tableId: table.id,
        eventDate,
        startTime,
        endTime,
        title: `${table.zone?.name || ''} ${table.title}`.trim() || 'Стол',
        comment: data.comment || null,
        status: 'confirmed',
      },
      include: { table: { include: { zone: true } } },
    });
  }

  // ==================== CONFIRM LEAD ====================
  /**
   * Подтверждение заявки: запрошенные столы и квесты становятся занятостью.
   * Пересечения проверяются для всего состава заранее — при конфликте не
   * создаётся ни одной записи, и менеджер видит, что именно занято.
   */
  async confirm(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tableSlots: { where: { tableId: { not: null } } },
        questSlots: { where: { questId: { not: null } }, include: { quest: true } },
        tableReservations: true,
        questReservations: true,
      },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');
    if (booking.status === 'canceled') throw new BadRequestException('Отменённую бронь нельзя подтвердить');

    const eventDate = new Date(booking.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const tableWindows = this.uniqueWindows(
      booking.tableSlots
        .filter(
          (slot) =>
            !booking.tableReservations.some(
              (r) =>
                r.tableId === slot.tableId &&
                r.status !== 'canceled' &&
                slotDateToMinutes(r.startTime) === slotDateToMinutes(slot.startTime),
            ),
        )
        .map((slot) => ({
          tableId: slot.tableId!,
          title: slot.title,
          startTime: slot.startTime,
          endTime: slot.endTime,
          startMinutes: slotDateToMinutes(slot.startTime),
          endMinutes: endMinutesOfDay(slot.endTime, slot.startTime),
        })),
      (item) => `${item.tableId}@${item.startMinutes}`,
    );

    const questWindows = this.uniqueWindows(
      booking.questSlots
        .filter(
          (slot) =>
            !booking.questReservations.some(
              (r) =>
                r.questId === slot.questId &&
                r.status !== 'canceled' &&
                slotDateToMinutes(r.startTime) === slotDateToMinutes(slot.startTime),
            ),
        )
        .map((slot) => {
          const duration = slot.quest?.durationMinutes ?? DEFAULT_PARTY_DURATION_MINUTES;
          const startMinutes = slotDateToMinutes(slot.startTime);
          return {
            questId: slot.questId!,
            branchId: slot.quest?.branchId ?? booking.branchId,
            title: slot.title,
            animatorName: slot.animatorName,
            startTime: slot.startTime,
            endTime: addMinutesToSlotDate(slot.startTime, duration),
            startMinutes,
            endMinutes: Math.min(DAY_END_MINUTES, startMinutes + duration),
          };
        }),
      (item) => `${item.questId}@${item.startMinutes}`,
    );

    const conflicts = [
      ...this.selfOverlapMessages(tableWindows, (item) => item.tableId),
      ...this.selfOverlapMessages(questWindows, (item) => item.questId),
      ...(await this.tableConflictMessages(eventDate, tableWindows)),
      ...(await this.questConflictMessages(eventDate, questWindows)),
    ];
    if (conflicts.length) throw new BadRequestException(conflicts.join('; '));

    return this.prisma.$transaction(async (tx) => {
      for (const item of tableWindows) {
        await tx.tableReservation.create({
          data: {
            bookingId,
            branchId: booking.branchId,
            tableId: item.tableId,
            eventDate,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title || 'Стол',
            status: 'confirmed',
          },
        });
      }

      for (const item of questWindows) {
        await tx.questReservation.create({
          data: {
            bookingId,
            clientId: booking.clientId,
            branchId: item.branchId,
            questId: item.questId,
            eventDate,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title || 'Квест',
            animatorName: item.animatorName,
            status: 'confirmed',
          },
        });
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: { status: 'confirmed' },
        include: {
          branch: true,
          tableSlots: true,
          questSlots: { include: { quest: true } },
          tableReservations: { include: { table: { include: { zone: true } } }, orderBy: { startTime: 'asc' } },
          questReservations: { include: { quest: true }, orderBy: { startTime: 'asc' } },
        },
      });
    });
  }

  /** Убирает дубли: одна и та же позиция в заявке — это одно занятие. */
  private uniqueWindows<T>(items: T[], key: (item: T) => string): T[] {
    const byKey = new Map<string, T>();
    for (const item of items) {
      const windowKey = key(item);
      if (!byKey.has(windowKey)) byKey.set(windowKey, item);
    }
    return [...byKey.values()];
  }

  /**
   * Пересечения внутри самой заявки: в базе таких записей ещё нет, поэтому
   * проверка по занятым слотам их не видит, а подтверждение создало бы два
   * занятия на один стол или квест.
   */
  private selfOverlapMessages<T extends { title: string; startMinutes: number; endMinutes: number }>(
    items: T[],
    resourceId: (item: T) => string,
  ): string[] {
    const messages: string[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const first = items[i];
        const second = items[j];
        if (resourceId(first) !== resourceId(second)) continue;
        if (first.startMinutes < second.endMinutes && first.endMinutes > second.startMinutes) {
          messages.push(`«${first.title}» в заявке повторяется в пересекающееся время — оставьте одно время`);
        }
      }
    }
    return messages;
  }

  private async tableConflictMessages(
    eventDate: Date,
    requested: { tableId: string; title: string; startMinutes: number; endMinutes: number }[],
  ): Promise<string[]> {
    if (!requested.length) return [];

    const existing = await this.prisma.tableReservation.findMany({
      where: {
        tableId: { in: requested.map((item) => item.tableId) },
        eventDate,
        status: { not: ReservationStatus.canceled },
      },
    });

    const messages: string[] = [];
    for (const item of requested) {
      const clash = existing.find(
        (r) =>
          r.tableId === item.tableId &&
          item.startMinutes < endMinutesOfDay(r.endTime, r.startTime) + r.cleaningBufferMinutes &&
          item.endMinutes > slotDateToMinutes(r.startTime),
      );
      if (clash) {
        messages.push(
          `Стол «${item.title}» занят с ${slotDateToHHMM(clash.startTime)} до ${slotDateToHHMM(clash.endTime)} — ` +
            'выберите другое время или уберите стол из заявки',
        );
      }
    }
    return messages;
  }

  private async questConflictMessages(
    eventDate: Date,
    requested: { questId: string; title: string; startMinutes: number; endMinutes: number }[],
  ): Promise<string[]> {
    if (!requested.length) return [];

    const existing = await this.prisma.questReservation.findMany({
      where: {
        questId: { in: requested.map((item) => item.questId) },
        eventDate,
        status: { not: ReservationStatus.canceled },
      },
    });

    const messages: string[] = [];
    for (const item of requested) {
      const clash = existing.find(
        (r) =>
          r.questId === item.questId &&
          item.startMinutes < endMinutesOfDay(r.endTime, r.startTime) &&
          item.endMinutes > slotDateToMinutes(r.startTime),
      );
      if (clash) {
        messages.push(
          `Квест «${item.title}» занят с ${slotDateToHHMM(clash.startTime)} до ${slotDateToHHMM(clash.endTime)} — ` +
            'выберите другое время или уберите квест из заявки',
        );
      }
    }
    return messages;
  }

  // ==================== EXTRA SLOTS ====================
  async addExtraSlot(bookingId: string, data: any) {
    // Determine type and title
    const { BookingExtraType } = await import('@prisma/client');
    let type: typeof BookingExtraType.show_program | typeof BookingExtraType.pinata | typeof BookingExtraType.other = BookingExtraType.other;
    let title = 'Доп. услуга';
    let catalogPrice: number | null = null;
    
    if (data.showProgramId) {
      type = BookingExtraType.show_program;
      const show = await this.prisma.showProgram.findUnique({
        where: { id: data.showProgramId },
      });
      title = show?.name || 'Шоу-программа';
      catalogPrice = show?.priceRub ?? null;
    } else if (data.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: data.supplierId },
      });
      title = supplier?.name || 'Поставщик';
    }
    
    // Parse times
    let startTime: Date | null = null;
    let endTime: Date | null = null;
    
    if (data.startTime) {
      const [h, m] = data.startTime.split(':').map(Number);
      startTime = new Date();
      startTime.setHours(h, m, 0, 0);
    }
    if (data.endTime) {
      const [h, m] = data.endTime.split(':').map(Number);
      endTime = new Date();
      endTime.setHours(h, m, 0, 0);
    }
    
    return this.prisma.bookingExtraSlot.create({
      data: {
        bookingId,
        type,
        title,
        startTime,
        endTime,
        // Цену берём из справочника, когда заявка пришла без неё
        priceRub: data.priceRub ?? catalogPrice ?? 0,
        comment: data.comment || null,
      },
    });
  }

  async removeExtraSlot(id: string) {
    await this.prisma.bookingExtraSlot.delete({ where: { id } });
    return { message: 'Доп. слот удален' };
  }

  // ==================== CAKES ====================
  async addCake(bookingId: string, data: any) {
    // Get cake info for title
    const cake = data.cakeId ? await this.prisma.cake.findUnique({
      where: { id: data.cakeId },
    }) : null;
    
    const title = cake ? cake.name : 'Торт';
    
    return this.prisma.bookingCake.create({
      data: {
        bookingId,
        cakeId: data.cakeId || null,
        title,
        inscription: data.inscription || null,
        priceRub: data.priceRub ?? cake?.priceRub ?? 0,
        comment: data.comment || null,
      },
      include: { cake: true },
    });
  }

  async removeCake(id: string) {
    await this.prisma.bookingCake.delete({ where: { id } });
    return { message: 'Торт удален из брони' };
  }

  // ==================== DECORATIONS ====================
  async addDecorationItem(bookingId: string, data: any) {
    // Get decoration info for title
    const decoration = data.decorationId ? await this.prisma.decoration.findUnique({
      where: { id: data.decorationId },
    }) : null;
    
    const title = decoration ? decoration.name : 'Украшение';
    
    return this.prisma.bookingDecorationItem.create({
      data: {
        bookingId,
        decorationId: data.decorationId || null,
        title,
        qty: data.quantity || data.qty || 1,
        priceRub: data.priceRub ?? decoration?.priceRub ?? 0,
        comment: data.comment || null,
      },
      include: { decoration: true },
    });
  }

  async removeDecorationItem(id: string) {
    await this.prisma.bookingDecorationItem.delete({ where: { id } });
    return { message: 'Декорация удалена из брони' };
  }

  // ==================== FOOD ====================
  async addFoodItem(bookingId: string, data: any) {
    const iikoItemId = data.iikoItemId || data.menuItemId || null;
    // Выбор из каталога приходит только с iikoId позиции: название, цену и цех
    // сохраняем снапшотом, чтобы строка осталась читаемой после обновления меню.
    const catalogItem = iikoItemId
      ? await this.prisma.iikoMenuItem.findFirst({
          where: { OR: [{ iikoId: iikoItemId }, { id: iikoItemId }] },
        })
      : null;

    const title = data.title || data.menuItemName || catalogItem?.name || 'Блюдо';
    const priceRub = Number(data.priceRub ?? catalogItem?.price ?? 0) || 0;
    const department = data.department || catalogItem?.department || null;

    // Parse serving time
    let serveAt: Date | null = null;
    if (data.servingTime || data.serveAt) {
      const timeStr = data.servingTime || data.serveAt;
      const [h, m] = timeStr.split(':').map(Number);
      serveAt = new Date();
      serveAt.setHours(h, m, 0, 0);
    }
    
    return this.prisma.bookingFoodItem.create({
      data: {
        bookingId,
        title,
        iikoItemId,
        qty: data.quantity || data.qty || 1,
        serveAt,
        serveMode: data.serveMode || null,
        department,
        priceRub,
        comment: data.comment || null,
      },
    });
  }

  async removeFoodItem(id: string) {
    await this.prisma.bookingFoodItem.delete({ where: { id } });
    return { message: 'Блюдо удалено из брони' };
  }
}
