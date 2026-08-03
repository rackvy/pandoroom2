import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { VRHall } from '@prisma/client';

const SLOT_STEP = 30; // minutes
const DAY_START = 10 * 60; // 10:00
const DAY_END = 24 * 60; // 24:00 (exclusive)
export const SPLIT_HALF_CAPACITY = 8; // максимум гостей на каждой половине сплита

/* ── time helpers (times are stored as 1970-01-01 UTC dates) ── */

function parseHHMM(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) throw new BadRequestException(`Некорректное время: ${value}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new BadRequestException(`Некорректное время: ${value}`);
  return h * 60 + min;
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minToUTCDate(min: number): Date {
  return new Date(`1970-01-01T${minToHHMM(min)}:00.000Z`);
}

function dateToMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

@Injectable()
export class VRScheduleService {
  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
  ) {}

  /* ==================== HALLS ==================== */

  async getHalls(branchId: string) {
    return this.prisma.vRHall.findMany({
      where: { branchId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { reservations: true, priceRules: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createHall(data: { branchId: string; name: string; maxCapacity?: number; basePricePerHour?: number }) {
    return this.prisma.vRHall.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        ...(data.maxCapacity != null ? { maxCapacity: data.maxCapacity } : {}),
        ...(data.basePricePerHour != null ? { basePricePerHour: data.basePricePerHour } : {}),
      },
      include: { priceRules: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateHall(id: string, data: any) {
    const hall = await this.prisma.vRHall.findUnique({ where: { id } });
    if (!hall) {
      throw new NotFoundException('VR-зал не найден');
    }
    const { name, maxCapacity, basePricePerHour, sortOrder, isActive } = data || {};
    return this.prisma.vRHall.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(maxCapacity !== undefined ? { maxCapacity: maxCapacity ? Number(maxCapacity) : undefined } : {}),
        ...(basePricePerHour !== undefined ? { basePricePerHour: Number(basePricePerHour) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: { priceRules: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteHall(id: string) {
    const hall = await this.prisma.vRHall.findUnique({ where: { id } });
    if (!hall) {
      throw new NotFoundException('VR-зал не найден');
    }
    return this.prisma.vRHall.delete({ where: { id } });
  }

  /* ==================== PRICE RULES ==================== */

  private validatePriceRule(data: any) {
    const days: number[] = Array.isArray(data.days) ? data.days.map(Number) : [];
    if (days.length === 0) {
      throw new BadRequestException('Укажите хотя бы один день недели');
    }
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestException('Дни недели: числа от 0 (вс) до 6 (сб)');
    }
    const fromMinutes = Number(data.fromMinutes);
    const toMinutes = Number(data.toMinutes);
    if (!Number.isFinite(fromMinutes) || !Number.isFinite(toMinutes) || fromMinutes >= toMinutes) {
      throw new BadRequestException('Время начала должно быть раньше времени окончания');
    }
    const pricePerHour = Number(data.pricePerHour);
    if (!Number.isFinite(pricePerHour) || pricePerHour <= 0) {
      throw new BadRequestException('Цена за час должна быть больше нуля');
    }
    return { days, fromMinutes, toMinutes, pricePerHour };
  }

  async createPriceRule(hallId: string, data: any) {
    const hall = await this.prisma.vRHall.findUnique({ where: { id: hallId } });
    if (!hall) throw new NotFoundException('VR-зал не найден');
    const v = this.validatePriceRule(data);
    return this.prisma.vRPriceRule.create({
      data: {
        hallId,
        name: data.name || null,
        ...v,
        sortOrder: data.sortOrder != null ? Number(data.sortOrder) : 0,
      },
    });
  }

  async updatePriceRule(id: string, data: any) {
    const rule = await this.prisma.vRPriceRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Ценовое правило не найдено');
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name || null;
    if (data.sortOrder !== undefined) patch.sortOrder = Number(data.sortOrder);
    if (data.days !== undefined || data.fromMinutes !== undefined || data.toMinutes !== undefined || data.pricePerHour !== undefined) {
      const merged = {
        days: data.days !== undefined ? data.days : rule.days,
        fromMinutes: data.fromMinutes !== undefined ? data.fromMinutes : rule.fromMinutes,
        toMinutes: data.toMinutes !== undefined ? data.toMinutes : rule.toMinutes,
        pricePerHour: data.pricePerHour !== undefined ? data.pricePerHour : rule.pricePerHour,
      };
      Object.assign(patch, this.validatePriceRule(merged));
    }
    return this.prisma.vRPriceRule.update({ where: { id }, data: patch });
  }

  async deletePriceRule(id: string) {
    const rule = await this.prisma.vRPriceRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Ценовое правило не найдено');
    return this.prisma.vRPriceRule.delete({ where: { id } });
  }

  /* ==================== PRICING ==================== */

  /** Price per person per hour for a given weekday/time, first matching rule wins (by sortOrder) */
  private priceForSlot(hall: VRHall & { priceRules: { days: number[]; fromMinutes: number; toMinutes: number; pricePerHour: number; sortOrder: number }[] }, weekday: number, slotStartMin: number): number {
    const rule = hall.priceRules.find(
      (r) => r.days.includes(weekday) && slotStartMin >= r.fromMinutes && slotStartMin < r.toMinutes,
    );
    return rule ? rule.pricePerHour : hall.basePricePerHour;
  }

  /** Buyout price = sum over 30-min segments of (pricePerHour / 2 × hall capacity) */
  calcBuyoutTotal(
    hall: VRHall & { priceRules: { days: number[]; fromMinutes: number; toMinutes: number; pricePerHour: number; sortOrder: number }[] },
    date: Date,
    startMin: number,
    endMin: number,
  ): number {
    const weekday = date.getUTCDay();
    let total = 0;
    for (let seg = startMin; seg < endMin; seg += SLOT_STEP) {
      const perHour = this.priceForSlot(hall, weekday, seg);
      total += (perHour / (60 / SLOT_STEP)) * hall.maxCapacity;
    }
    return Math.round(total);
  }

  async getPrice(hallId: string, dateStr: string, startTime: string, endTime: string) {
    const hall = await this.prisma.vRHall.findUnique({
      where: { id: hallId },
      include: { priceRules: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!hall) throw new NotFoundException('VR-зал не найден');

    const startMin = parseHHMM(startTime);
    const endMin = parseHHMM(endTime);
    if (endMin <= startMin) throw new BadRequestException('Время окончания должно быть позже времени начала');

    const date = new Date(dateStr);
    const weekday = date.getUTCDay();

    const segments: { time: string; pricePerHour: number }[] = [];
    for (let seg = startMin; seg < endMin; seg += SLOT_STEP) {
      segments.push({ time: minToHHMM(seg), pricePerHour: this.priceForSlot(hall, weekday, seg) });
    }

    return {
      hallId: hall.id,
      maxCapacity: hall.maxCapacity,
      segments,
      buyoutTotal: this.calcBuyoutTotal(hall, date, startMin, endMin),
    };
  }

  /* ==================== SCHEDULE / AVAILABILITY ==================== */

  async getSchedule(branchId: string, date: string) {
    const halls = await this.prisma.vRHall.findMany({
      where: { branchId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        reservations: {
          where: { date: new Date(date) },
          include: { game: true, client: true, booking: { include: { client: true } } },
        },
        priceRules: { orderBy: { sortOrder: 'asc' } },
        splits: {
          where: { date: new Date(date) },
          orderBy: { startTime: 'asc' },
        },
      },
    });
    return halls;
  }

  /** Public availability grid: free seats + price per 30-min slot */
  async getAvailability(branchId: string, dateStr: string) {
    const halls = await this.prisma.vRHall.findMany({
      where: { branchId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        reservations: {
          where: { date: new Date(dateStr), status: { not: 'canceled' } },
        },
        priceRules: { orderBy: { sortOrder: 'asc' } },
        splits: {
          where: { date: new Date(dateStr) },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    const date = new Date(dateStr);
    const weekday = date.getUTCDay();

    return halls.map((hall) => {
      const slots: {
        time: string;
        free: number;
        blocked: boolean;
        pricePerHour: number;
        split?: { start: string; end: string; freeA: number; freeB: number };
      }[] = [];
      for (let min = DAY_START; min < DAY_END; min += SLOT_STEP) {
        const segEnd = min + SLOT_STEP;
        const overlapping = hall.reservations.filter((r) => {
          const rStart = dateToMinutes(r.startTime);
          const rEnd = dateToMinutes(r.endTime);
          return rStart < segEnd && rEnd > min;
        });
        const blocked = overlapping.some((r) => r.type === 'blocked');
        // Сплиты выровнены по 30-минутной сетке, поэтому пересечение = полное покрытие слота
        const split = hall.splits.find((s) => {
          const sStart = dateToMinutes(s.startTime);
          const sEnd = dateToMinutes(s.endTime);
          return sStart <= min && sEnd >= segEnd;
        });
        if (split) {
          const takenA = overlapping
            .filter((r) => r.halfSide === 'A' || r.halfSide == null)
            .reduce((sum, r) => sum + r.guestsCount, 0);
          const takenB = overlapping
            .filter((r) => r.halfSide === 'B' || r.halfSide == null)
            .reduce((sum, r) => sum + r.guestsCount, 0);
          const freeA = Math.max(0, SPLIT_HALF_CAPACITY - takenA);
          const freeB = Math.max(0, SPLIT_HALF_CAPACITY - takenB);
          slots.push({
            time: minToHHMM(min),
            free: freeA + freeB,
            blocked: false,
            pricePerHour: this.priceForSlot(hall, weekday, min),
            split: {
              start: minToHHMM(dateToMinutes(split.startTime)),
              end: minToHHMM(dateToMinutes(split.endTime)),
              freeA,
              freeB,
            },
          });
          continue;
        }
        const taken = overlapping.reduce((sum, r) => sum + r.guestsCount, 0);
        slots.push({
          time: minToHHMM(min),
          free: blocked ? 0 : Math.max(0, hall.maxCapacity - taken),
          blocked,
          pricePerHour: this.priceForSlot(hall, weekday, min),
        });
      }
      return {
        id: hall.id,
        name: hall.name,
        maxCapacity: hall.maxCapacity,
        slots,
      };
    });
  }

  /* ==================== RESERVATIONS ==================== */

  private validateTimes(type: string, startMin: number, endMin: number, minDuration = 60) {
    if (startMin % SLOT_STEP !== 0 || endMin % SLOT_STEP !== 0) {
      throw new BadRequestException('Время должно быть кратно 30 минутам (например, 12:00 или 12:30)');
    }
    const duration = endMin - startMin;
    if (type === 'blocked') {
      if (duration !== SLOT_STEP) {
        throw new BadRequestException('Блокировка длится ровно 30 минут');
      }
    } else {
      if (duration < minDuration) {
        throw new BadRequestException(`Минимальная длительность брони — ${minDuration} минут`);
      }
    }
    if (endMin > DAY_END) {
      throw new BadRequestException('Бронь не может выходить за пределы рабочего дня (до 00:00)');
    }
  }

  /**
   * Shared capacity check: every 30-min segment of the new reservation must have
   * enough free seats. Blocked segments are untouchable; full_hall needs all seats free.
   *
   * Split rules: a reservation may either lie fully inside one split window
   * (then it must be an open_slot with a halfSide, max SPLIT_HALF_CAPACITY per half)
   * or fully outside all splits. Crossing a split boundary is forbidden.
   */
  private async assertCapacity(
    hall: { id: string; maxCapacity: number },
    date: Date,
    startMin: number,
    endMin: number,
    guests: number,
    opts: { type?: string; halfSide?: 'A' | 'B' | null; excludeId?: string } = {},
  ) {
    const overlapping = await this.prisma.vRReservation.findMany({
      where: {
        hallId: hall.id,
        date,
        status: { not: 'canceled' },
        startTime: { lt: minToUTCDate(endMin) },
        endTime: { gt: minToUTCDate(startMin) },
        ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      },
    });

    const splits = await this.prisma.vRHallSplit.findMany({
      where: { hallId: hall.id, date },
      orderBy: { startTime: 'asc' },
    });
    const overlappingSplits = splits.filter((s) => {
      const sStart = dateToMinutes(s.startTime);
      const sEnd = dateToMinutes(s.endTime);
      return sStart < endMin && sEnd > startMin;
    });

    if (overlappingSplits.length > 0) {
      const enclosing = overlappingSplits.find((s) => {
        const sStart = dateToMinutes(s.startTime);
        const sEnd = dateToMinutes(s.endTime);
        return startMin >= sStart && endMin <= sEnd;
      });
      if (!enclosing) {
        const s = overlappingSplits[0];
        throw new ConflictException(
          `Зал разделён (сплит) с ${minToHHMM(dateToMinutes(s.startTime))} до ${minToHHMM(dateToMinutes(s.endTime))} — бронь не может пересекать границу сплита. Либо целиком внутри, либо после него.`,
        );
      }
      if ((opts.type || 'open_slot') !== 'open_slot') {
        throw new ConflictException('В окне сплита доступны только брони мест — выкуп и блокировка всего зала невозможны');
      }
      if (!opts.halfSide) {
        throw new BadRequestException('В это время зал разделён на две половины — выберите половину');
      }
      if (guests > SPLIT_HALF_CAPACITY) {
        throw new ConflictException(`В режиме сплита на каждой половине максимум ${SPLIT_HALF_CAPACITY} гостей`);
      }

      for (let seg = startMin; seg < endMin; seg += SLOT_STEP) {
        const segEnd = seg + SLOT_STEP;
        const inSlot = overlapping.filter((r) => {
          const rStart = dateToMinutes(r.startTime);
          const rEnd = dateToMinutes(r.endTime);
          return rStart < segEnd && rEnd > seg;
        });
        const taken = inSlot
          .filter((r) => r.halfSide === opts.halfSide || r.halfSide == null)
          .reduce((sum, r) => sum + r.guestsCount, 0);
        const free = SPLIT_HALF_CAPACITY - taken;
        if (guests > free) {
          throw new ConflictException(
            free > 0
              ? `На ${minToHHMM(seg)} на половине ${opts.halfSide} свободно только ${free} из ${SPLIT_HALF_CAPACITY} мест`
              : `На ${minToHHMM(seg)} на половине ${opts.halfSide} нет свободных мест`,
          );
        }
      }
      return;
    }

    if (opts.halfSide) {
      throw new BadRequestException('В выбранное время зал не разделён — половина не указывается');
    }

    for (let seg = startMin; seg < endMin; seg += SLOT_STEP) {
      const segEnd = seg + SLOT_STEP;
      const inSlot = overlapping.filter((r) => {
        const rStart = dateToMinutes(r.startTime);
        const rEnd = dateToMinutes(r.endTime);
        return rStart < segEnd && rEnd > seg;
      });
      if (inSlot.some((r) => r.type === 'blocked')) {
        throw new ConflictException(`Время ${minToHHMM(seg)} заблокировано администратором`);
      }
      const taken = inSlot.reduce((sum, r) => sum + r.guestsCount, 0);
      const free = hall.maxCapacity - taken;
      if (guests > free) {
        throw new ConflictException(
          free > 0
            ? `На ${minToHHMM(seg)} свободно только ${free} из ${hall.maxCapacity} мест`
            : `На ${minToHHMM(seg)} нет свободных мест`,
        );
      }
    }
  }

  async createReservation(data: any, status: 'draft' | 'confirmed' = 'confirmed', minDuration = 60) {
    const hall = await this.prisma.vRHall.findUnique({ where: { id: data.hallId } });
    if (!hall) {
      throw new NotFoundException('VR-зал не найден');
    }

    const type = data.type === 'blocked' ? 'blocked' : data.type === 'full_hall' ? 'full_hall' : 'open_slot';
    const halfSide = data.halfSide === 'A' || data.halfSide === 'B' ? data.halfSide : null;
    const startMin = parseHHMM(data.startTime);
    const endMin = parseHHMM(data.endTime);
    this.validateTimes(type, startMin, endMin, minDuration);

    const guests = type === 'blocked' || type === 'full_hall' ? hall.maxCapacity : Math.max(1, Number(data.guestsCount) || 1);
    if (type === 'open_slot' && guests > hall.maxCapacity) {
      throw new BadRequestException(`Максимум ${hall.maxCapacity} гостей`);
    }

    const date = new Date(data.date);
    await this.assertCapacity(hall, date, startMin, endMin, guests, { type, halfSide });

    // Link to a client: explicit clientId wins, otherwise get-or-create by phone
    let clientId: string | null = null;
    if (data.clientId) {
      clientId = data.clientId;
    } else if (data.clientPhone && String(data.clientPhone).trim()) {
      const client = await this.clientsService.getOrCreate(
        String(data.clientPhone).trim(),
        (data.clientName || '').trim() || 'Гость',
      );
      clientId = client.id;
    }

    return this.prisma.vRReservation.create({
      data: {
        hallId: hall.id,
        date,
        startTime: minToUTCDate(startMin),
        endTime: minToUTCDate(endMin),
        type,
        title: data.title || null,
        description: data.description || null,
        gameId: data.gameId || null,
        clientName: data.clientName || null,
        clientPhone: data.clientPhone || null,
        clientId,
        guestsCount: guests,
        maxGuests: data.maxGuests != null ? Number(data.maxGuests) : null,
        halfSide: halfSide || null,
        bookingId: data.bookingId || null,
        status,
      },
      include: { game: true, hall: true, client: true },
    });
  }

  async updateReservation(id: string, data: any, minDuration = 60) {
    const reservation = await this.prisma.vRReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Бронь не найдена');
    }

    const hallId = data.hallId || reservation.hallId;
    const hall = await this.prisma.vRHall.findUnique({ where: { id: hallId } });
    if (!hall) throw new NotFoundException('VR-зал не найден');

    const type = data.type === 'blocked' ? 'blocked' : data.type === 'full_hall' ? 'full_hall' : reservation.type;
    const halfSide =
      data.halfSide === undefined
        ? reservation.halfSide
        : data.halfSide === 'A' || data.halfSide === 'B'
          ? data.halfSide
          : null;
    const date = data.date ? new Date(data.date) : reservation.date;
    const startMin = data.startTime ? parseHHMM(data.startTime) : dateToMinutes(reservation.startTime);
    const endMin = data.endTime ? parseHHMM(data.endTime) : dateToMinutes(reservation.endTime);

    let guests = reservation.guestsCount;
    if (type === 'blocked' || type === 'full_hall') {
      guests = hall.maxCapacity;
    } else if (data.guestsCount !== undefined) {
      guests = Math.max(1, Number(data.guestsCount) || 1);
    }
    if (type === 'open_slot' && guests > hall.maxCapacity) {
      throw new BadRequestException(`Максимум ${hall.maxCapacity} гостей`);
    }

    this.validateTimes(type, startMin, endMin, minDuration);
    await this.assertCapacity(hall, date, startMin, endMin, guests, { type, halfSide, excludeId: id });

    let clientId = reservation.clientId;
    if (data.clientId !== undefined) clientId = data.clientId || null;
    else if (data.clientPhone && String(data.clientPhone).trim()) {
      const client = await this.clientsService.getOrCreate(
        String(data.clientPhone).trim(),
        (data.clientName || '').trim() || 'Гость',
      );
      clientId = client.id;
    }

    return this.prisma.vRReservation.update({
      where: { id },
      data: {
        ...(data.hallId !== undefined ? { hallId } : {}),
        ...(data.date !== undefined ? { date } : {}),
        ...(data.startTime !== undefined ? { startTime: minToUTCDate(startMin) } : {}),
        ...(data.endTime !== undefined ? { endTime: minToUTCDate(endMin) } : {}),
        ...(data.type !== undefined ? { type } : {}),
        ...(data.halfSide !== undefined ? { halfSide: halfSide || null } : {}),
        ...(data.title !== undefined ? { title: data.title || null } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.gameId !== undefined ? { gameId: data.gameId || null } : {}),
        ...(data.clientName !== undefined ? { clientName: data.clientName || null } : {}),
        ...(data.clientPhone !== undefined ? { clientPhone: data.clientPhone || null } : {}),
        ...(clientId !== reservation.clientId || data.clientId !== undefined || data.clientPhone !== undefined ? { clientId } : {}),
        ...(data.guestsCount !== undefined || data.type !== undefined ? { guestsCount: guests } : {}),
        ...(data.maxGuests !== undefined ? { maxGuests: data.maxGuests != null ? Number(data.maxGuests) : null } : {}),
      },
      include: { game: true, hall: true, client: true },
    });
  }

  async moveReservation(id: string, data: any, minDuration = 60) {
    const reservation = await this.prisma.vRReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Бронь не найдена');
    }

    const hallId = data.hallId || reservation.hallId;
    const hall = await this.prisma.vRHall.findUnique({ where: { id: hallId } });
    if (!hall) throw new NotFoundException('VR-зал не найден');

    const date = data.date ? new Date(data.date) : reservation.date;
    const startMin = data.startTime ? parseHHMM(data.startTime) : dateToMinutes(reservation.startTime);
    const endMin = data.endTime ? parseHHMM(data.endTime) : dateToMinutes(reservation.endTime);
    this.validateTimes(reservation.type, startMin, endMin, minDuration);
    await this.assertCapacity(hall, date, startMin, endMin, reservation.guestsCount, {
      type: reservation.type,
      halfSide: reservation.halfSide,
      excludeId: id,
    });

    return this.prisma.vRReservation.update({
      where: { id },
      data: {
        hallId,
        date,
        startTime: minToUTCDate(startMin),
        endTime: minToUTCDate(endMin),
      },
      include: { game: true, hall: true },
    });
  }

  async cancelReservation(id: string) {
    const reservation = await this.prisma.vRReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Бронь не найдена');
    }
    return this.prisma.vRReservation.update({
      where: { id },
      data: { status: 'canceled' },
    });
  }

  async confirmReservation(id: string) {
    const reservation = await this.prisma.vRReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Бронь не найдена');
    }
    return this.prisma.vRReservation.update({
      where: { id },
      data: { status: 'confirmed' },
    });
  }

  async deleteReservation(id: string) {
    const reservation = await this.prisma.vRReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Бронь не найдена');
    }
    return this.prisma.vRReservation.delete({ where: { id } });
  }

  /* ==================== HALL SPLITS ==================== */

  /**
   * Создать окно сплита зала. Правила:
   * - время кратно 30 минутам, в пределах рабочего дня;
   * - нельзя поверх другого сплита;
   * - нельзя, пока в окне есть не-отменённые брони/выкупы/блокировки.
   */
  async createSplit(data: { hallId: string; date: string; startTime: string; endTime: string }) {
    const hall = await this.prisma.vRHall.findUnique({ where: { id: data.hallId } });
    if (!hall) {
      throw new NotFoundException('VR-зал не найден');
    }

    const startMin = parseHHMM(data.startTime);
    const endMin = parseHHMM(data.endTime);
    if (startMin % SLOT_STEP !== 0 || endMin % SLOT_STEP !== 0) {
      throw new BadRequestException('Время сплита должно быть кратно 30 минутам');
    }
    if (endMin <= startMin) {
      throw new BadRequestException('Окончание сплита должно быть позже начала');
    }
    if (endMin > DAY_END) {
      throw new BadRequestException('Сплит не может выходить за пределы рабочего дня (до 00:00)');
    }

    const date = new Date(data.date);

    const splitClash = await this.prisma.vRHallSplit.findFirst({
      where: {
        hallId: hall.id,
        date,
        startTime: { lt: minToUTCDate(endMin) },
        endTime: { gt: minToUTCDate(startMin) },
      },
    });
    if (splitClash) {
      throw new ConflictException(
        `Сплит уже задан: ${minToHHMM(dateToMinutes(splitClash.startTime))}–${minToHHMM(dateToMinutes(splitClash.endTime))}`,
      );
    }

    const reservationClash = await this.prisma.vRReservation.findFirst({
      where: {
        hallId: hall.id,
        date,
        status: { not: 'canceled' },
        startTime: { lt: minToUTCDate(endMin) },
        endTime: { gt: minToUTCDate(startMin) },
      },
    });
    if (reservationClash) {
      throw new ConflictException(
        'На это время уже есть брони или блокировки — сначала отмените их, затем создайте сплит',
      );
    }

    return this.prisma.vRHallSplit.create({
      data: {
        hallId: hall.id,
        date,
        startTime: minToUTCDate(startMin),
        endTime: minToUTCDate(endMin),
      },
    });
  }

  /** Удалить сплит можно, только пока в его окне нет не-отменённых броней */
  async deleteSplit(id: string) {
    const split = await this.prisma.vRHallSplit.findUnique({ where: { id } });
    if (!split) {
      throw new NotFoundException('Сплит не найден');
    }

    const reservationClash = await this.prisma.vRReservation.findFirst({
      where: {
        hallId: split.hallId,
        date: split.date,
        status: { not: 'canceled' },
        startTime: { lt: split.endTime },
        endTime: { gt: split.startTime },
      },
    });
    if (reservationClash) {
      throw new ConflictException('В окне сплита есть брони — сначала отмените их');
    }

    return this.prisma.vRHallSplit.delete({ where: { id } });
  }
}
