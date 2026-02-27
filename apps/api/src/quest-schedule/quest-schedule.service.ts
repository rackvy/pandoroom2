import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateSlotDto {
  questId: string;
  dayOfWeek: number;
  startTime: string;
  basePrice: number;
  isActive?: boolean;
}

interface UpdateSlotDto {
  startTime?: string;
  basePrice?: number;
  isActive?: boolean;
}

interface CreateSpecialPriceDto {
  slotId: string;
  specialDate: Date;
  specialPrice: number;
  isAvailable?: boolean;
}

interface UpdateSpecialPriceDto {
  specialPrice?: number;
  isAvailable?: boolean;
}

export interface ScheduleSlotResponse {
  id: string;
  questId: string;
  dayOfWeek: number;
  startTime: string;
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
  specialPrices: {
    id: string;
    specialDate: string;
    specialPrice: number;
    isAvailable: boolean;
  }[];
}

@Injectable()
export class QuestScheduleService {
  constructor(private prisma: PrismaService) {}

  // ==================== SLOTS ====================

  async findAllSlots(questId: string): Promise<ScheduleSlotResponse[]> {
    const slots = await this.prisma.questScheduleSlot.findMany({
      where: { questId },
      include: {
        specialPrices: {
          orderBy: { specialDate: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { sortOrder: 'asc' }, { startTime: 'asc' }],
    });

    return slots.map(slot => ({
      ...slot,
      specialPrices: slot.specialPrices.map(sp => ({
        ...sp,
        specialDate: sp.specialDate.toISOString().split('T')[0],
      })),
    }));
  }

  async findSlotById(id: string): Promise<ScheduleSlotResponse> {
    const slot = await this.prisma.questScheduleSlot.findUnique({
      where: { id },
      include: {
        specialPrices: {
          orderBy: { specialDate: 'asc' },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Слот не найден');
    }

    return {
      ...slot,
      specialPrices: slot.specialPrices.map(sp => ({
        ...sp,
        specialDate: sp.specialDate.toISOString().split('T')[0],
      })),
    };
  }

  async createSlot(data: CreateSlotDto): Promise<ScheduleSlotResponse> {
    // Get max sortOrder for this quest and day
    const maxSort = await this.prisma.questScheduleSlot.aggregate({
      where: { questId: data.questId, dayOfWeek: data.dayOfWeek },
      _max: { sortOrder: true },
    });

    const slot = await this.prisma.questScheduleSlot.create({
      data: {
        ...data,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: {
        specialPrices: true,
      },
    });

    return {
      ...slot,
      specialPrices: [],
    };
  }

  async updateSlot(id: string, data: UpdateSlotDto): Promise<ScheduleSlotResponse> {
    await this.findSlotById(id);

    const slot = await this.prisma.questScheduleSlot.update({
      where: { id },
      data,
      include: {
        specialPrices: {
          orderBy: { specialDate: 'asc' },
        },
      },
    });

    return {
      ...slot,
      specialPrices: slot.specialPrices.map(sp => ({
        ...sp,
        specialDate: sp.specialDate.toISOString().split('T')[0],
      })),
    };
  }

  async removeSlot(id: string): Promise<{ message: string }> {
    await this.findSlotById(id);
    await this.prisma.questScheduleSlot.delete({ where: { id } });
    return { message: 'Слот удален' };
  }

  // ==================== SPECIAL PRICES ====================

  async findSpecialPrices(slotId: string) {
    const prices = await this.prisma.questScheduleSpecialPrice.findMany({
      where: { slotId },
      orderBy: { specialDate: 'asc' },
    });

    return prices.map(price => ({
      ...price,
      specialDate: price.specialDate.toISOString().split('T')[0],
    }));
  }

  async createSpecialPrice(data: CreateSpecialPriceDto) {
    const price = await this.prisma.questScheduleSpecialPrice.create({
      data: {
        ...data,
        specialDate: new Date(data.specialDate),
      },
    });

    return {
      ...price,
      specialDate: price.specialDate.toISOString().split('T')[0],
    };
  }

  async updateSpecialPrice(id: string, data: UpdateSpecialPriceDto) {
    const price = await this.prisma.questScheduleSpecialPrice.findUnique({
      where: { id },
    });

    if (!price) {
      throw new NotFoundException('Специальная цена не найдена');
    }

    const updated = await this.prisma.questScheduleSpecialPrice.update({
      where: { id },
      data,
    });

    return {
      ...updated,
      specialDate: updated.specialDate.toISOString().split('T')[0],
    };
  }

  async removeSpecialPrice(id: string): Promise<{ message: string }> {
    const price = await this.prisma.questScheduleSpecialPrice.findUnique({
      where: { id },
    });

    if (!price) {
      throw new NotFoundException('Специальная цена не найдена');
    }

    await this.prisma.questScheduleSpecialPrice.delete({ where: { id } });
    return { message: 'Специальная цена удалена' };
  }

  // ==================== PUBLIC API ====================

  async getQuestScheduleForDate(questId: string, date: Date) {
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to 0=Monday, 6=Sunday

    const slots = await this.prisma.questScheduleSlot.findMany({
      where: {
        questId,
        dayOfWeek,
        isActive: true,
      },
      include: {
        specialPrices: {
          where: {
            specialDate: date,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
    });

    return slots.map(slot => {
      const specialPrice = slot.specialPrices[0];
      const isAvailable = specialPrice ? specialPrice.isAvailable : true;
      const price = specialPrice ? specialPrice.specialPrice : slot.basePrice;

      return {
        id: slot.id,
        startTime: slot.startTime,
        basePrice: slot.basePrice,
        finalPrice: price,
        isAvailable,
        hasSpecialPrice: !!specialPrice,
      };
    }).filter(slot => slot.isAvailable);
  }

  async getQuestScheduleForRange(questId: string, startDate: Date, endDate: Date) {
    const results: Record<string, any[]> = {};

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      results[dateStr] = await this.getQuestScheduleForDate(questId, new Date(d));
    }

    return results;
  }

  // ==================== SCHEDULE GRID API ====================

  async getQuestSlotsForDate(date: Date, branchId?: string) {
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to 0=Monday, 6=Sunday

    // Get all quests with their slots for this day
    const quests = await this.prisma.quest.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        scheduleSlots: {
          where: {
            dayOfWeek,
            isActive: true,
          },
          include: {
            specialPrices: {
              where: {
                specialDate: date,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    // Get all quest reservations for this date
    const questReservations = await this.prisma.questReservation.findMany({
      where: {
        eventDate: date,
      },
      include: {
        booking: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            status: true,
          },
        },
      },
    });

    // Build slots with reservation info
    const questsWithSlots = quests.map(quest => {
      const slots = quest.scheduleSlots.map(slot => {
        const specialPrice = slot.specialPrices[0];
        const isAvailable = specialPrice ? specialPrice.isAvailable : true;
        const price = specialPrice ? specialPrice.specialPrice : slot.basePrice;

        // Find reservation for this slot (by startTime matching)
        // r.startTime is Date, slot.startTime is string (HH:MM)
        // Convert Date to HH:MM in local timezone
        const reservation = questReservations.find(
          r => {
            const rHours = r.startTime.getHours().toString().padStart(2, '0');
            const rMinutes = r.startTime.getMinutes().toString().padStart(2, '0');
            const rTimeStr = `${rHours}:${rMinutes}`;
            return r.questId === quest.id && rTimeStr === slot.startTime;
          }
        );

        return {
          slotId: slot.id,
          startTime: slot.startTime,
          basePrice: slot.basePrice,
          finalPrice: price,
          hasSpecialPrice: !!specialPrice,
          isAvailable,
          reservation: reservation ? {
            id: reservation.id,
            bookingId: reservation.bookingId,
            clientName: reservation.booking.clientName,
            status: reservation.booking.status,
          } : null,
        };
      });

      return {
        questId: quest.id,
        questName: quest.name,
        durationMinutes: quest.durationMinutes,
        slots,
      };
    });

    // Filter out quests with no slots
    return questsWithSlots.filter(q => q.slots.length > 0);
  }
}
