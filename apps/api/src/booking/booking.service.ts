import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
  ) {}

  async findAll(filters?: { branchId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    
    if (filters?.branchId) {
      where.branchId = filters.branchId;
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

  async create(data: any) {
    // Get or create client by phone
    let clientId: string | null = null;
    if (data.clientPhone && data.clientName) {
      const client = await this.clientsService.getOrCreate(
        data.clientPhone,
        data.clientName,
      );
      clientId = client.id;
    }

    const prismaData = {
      ...data,
      clientId,
      eventDate: new Date(data.eventDate),
    };
    return this.prisma.booking.create({
      data: prismaData,
      include: {
        branch: true,
        manager: { select: { id: true, fullName: true, email: true } },
      },
    });
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
        tableReservations: {
          include: { table: { include: { zone: true } } },
          orderBy: { startTime: 'asc' },
        },
        questReservations: {
          include: { quest: true },
          orderBy: { startTime: 'asc' },
        },
        extraSlots: true,
        bookingCakes: { include: { cake: true } },
        decorationItems: { include: { decoration: true } },
        foodItems: true,
      },
    });

    if (!booking) throw new NotFoundException('Бронирование не найдено');

    // Format times as HH:MM strings
    const formatTime = (date: Date) => date.toTimeString().slice(0, 5);

    return {
      id: booking.id,
      status: booking.status,
      eventDate: booking.eventDate.toISOString().split('T')[0],
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
      })),
      extraSlots: booking.extraSlots,
      bookingCakes: booking.bookingCakes,
      decorationItems: booking.decorationItems,
      foodItems: booking.foodItems,
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

    // Update booking
    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        depositRub: data.depositRub,
        status: data.status,
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

  // ==================== EXTRA SLOTS ====================
  async addExtraSlot(bookingId: string, data: any) {
    // Determine type and title
    const { BookingExtraType } = await import('@prisma/client');
    let type: typeof BookingExtraType.show_program | typeof BookingExtraType.pinata | typeof BookingExtraType.other = BookingExtraType.other;
    let title = 'Доп. услуга';
    
    if (data.showProgramId) {
      type = BookingExtraType.show_program;
      const show = await this.prisma.showProgram.findUnique({
        where: { id: data.showProgramId },
      });
      title = show?.name || 'Шоу-программа';
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
        priceRub: data.priceRub || 0,
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
        priceRub: data.priceRub || 0,
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
        priceRub: data.priceRub || 0,
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
    // Title comes from frontend or use default
    const title = data.title || data.menuItemName || 'Блюдо';
    
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
        qty: data.quantity || data.qty || 1,
        serveAt,
        serveMode: data.serveMode || null,
        priceRub: data.priceRub || 0,
        comment: data.comment || null,
      },
    });
  }

  async removeFoodItem(id: string) {
    await this.prisma.bookingFoodItem.delete({ where: { id } });
    return { message: 'Блюдо удалено из брони' };
  }
}
