import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationStatus, BookingStatus } from '@prisma/client';
import {
  CreateTableReservationDto,
  MoveTableReservationDto,
  TableReservationResponseDto,
} from './dto/table-reservation.dto';
import {
  CreateQuestReservationDto,
  MoveQuestReservationDto,
  QuestReservationResponseDto,
} from './dto/quest-reservation.dto';
import {
  QuickTableBookingDto,
  QuickQuestBookingDto,
  QuickBookingResponse,
} from './dto/quick-booking.dto';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // ==================== TABLE SCHEDULE ====================

  async getTablesSchedule(branchId: string, date: string) {
    // Parse date as local date (YYYY-MM-DD) to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);

    const [zones, tables, reservations] = await Promise.all([
      this.prisma.tableZone.findMany({
        where: { branchId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, key: true, name: true, sortOrder: true },
      }),
      this.prisma.table.findMany({
        where: { branchId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, zoneId: true, title: true, sortOrder: true },
      }),
      this.prisma.tableReservation.findMany({
        where: {
          branchId,
          eventDate,
          status: { not: ReservationStatus.canceled },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const formattedReservations: TableReservationResponseDto[] = reservations.map((r) => {
      const blockedUntil = this.addMinutesToTime(
        this.timeToString(r.endTime),
        r.cleaningBufferMinutes,
      );
      return {
        id: r.id,
        bookingId: r.bookingId,
        tableId: r.tableId,
        title: r.title,
        comment: r.comment,
        status: r.status,
        eventDate: r.eventDate.toISOString().split('T')[0],
        startTime: this.timeToString(r.startTime),
        endTime: this.timeToString(r.endTime),
        cleaningBufferMinutes: r.cleaningBufferMinutes,
        blockedUntilTime: blockedUntil,
      };
    });

    return { zones, tables, reservations: formattedReservations };
  }

  async createTableReservation(dto: CreateTableReservationDto): Promise<TableReservationResponseDto> {
    // Validate 30-minute alignment
    this.validateTimeAlignment(dto.startTime, dto.endTime);

    const eventDate = new Date(dto.eventDate);
    const startTime = this.stringToTime(dto.startTime);
    const endTime = this.stringToTime(dto.endTime);

    // Check for overlaps
    await this.checkTableOverlap(dto.tableId, eventDate, startTime, endTime);

    const reservation = await this.prisma.tableReservation.create({
      data: {
        bookingId: dto.bookingId,
        tableId: dto.tableId,
        branchId: dto.branchId,
        eventDate,
        startTime,
        endTime,
        title: dto.title || 'Бронь стола',
        comment: dto.comment,
        status: ReservationStatus.confirmed,
      },
    });

    return this.formatTableReservation(reservation);
  }

  async moveTableReservation(
    id: string,
    dto: MoveTableReservationDto,
  ): Promise<TableReservationResponseDto> {
    this.validateTimeAlignment(dto.startTime, dto.endTime);

    const existing = await this.prisma.tableReservation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Reservation not found');
    }

    const tableId = dto.tableId || existing.tableId;
    const startTime = this.stringToTime(dto.startTime);
    const endTime = this.stringToTime(dto.endTime);

    // Check overlaps excluding current reservation
    await this.checkTableOverlap(
      tableId,
      existing.eventDate,
      startTime,
      endTime,
      id,
    );

    const updated = await this.prisma.tableReservation.update({
      where: { id },
      data: {
        tableId,
        startTime,
        endTime,
      },
    });

    return this.formatTableReservation(updated);
  }

  async cancelTableReservation(id: string): Promise<void> {
    await this.prisma.tableReservation.update({
      where: { id },
      data: { status: ReservationStatus.canceled },
    });
  }

  // ==================== QUEST SCHEDULE ====================

  async getQuestsSchedule(branchId: string, date: string) {
    const eventDate = new Date(date);

    const [quests, reservations] = await Promise.all([
      this.prisma.quest.findMany({
        where: { branchId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, durationMinutes: true },
      }),
      this.prisma.questReservation.findMany({
        where: {
          branchId,
          eventDate,
          status: { not: ReservationStatus.canceled },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const formattedReservations: QuestReservationResponseDto[] = reservations.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      questId: r.questId,
      title: r.title,
      animatorName: r.animatorName,
      comment: r.comment,
      status: r.status,
      startTime: this.timeToString(r.startTime),
      endTime: this.timeToString(r.endTime),
    }));

    return { quests, reservations: formattedReservations };
  }

  async createQuestReservation(dto: CreateQuestReservationDto): Promise<QuestReservationResponseDto> {
    this.validateTimeAlignment(dto.startTime, dto.endTime);

    const eventDate = new Date(dto.eventDate);
    const startTime = this.stringToTime(dto.startTime);
    const endTime = this.stringToTime(dto.endTime);

    await this.checkQuestOverlap(dto.questId, eventDate, startTime, endTime);

    const reservation = await this.prisma.questReservation.create({
      data: {
        bookingId: dto.bookingId,
        questId: dto.questId,
        branchId: dto.branchId,
        eventDate,
        startTime,
        endTime,
        title: dto.title,
        animatorName: dto.animatorName,
        comment: dto.comment,
        status: ReservationStatus.confirmed,
      },
    });

    return this.formatQuestReservation(reservation);
  }

  async moveQuestReservation(
    id: string,
    dto: MoveQuestReservationDto,
  ): Promise<QuestReservationResponseDto> {
    this.validateTimeAlignment(dto.startTime, dto.endTime);

    const existing = await this.prisma.questReservation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Reservation not found');
    }

    const questId = dto.questId || existing.questId;
    const startTime = this.stringToTime(dto.startTime);
    const endTime = this.stringToTime(dto.endTime);

    await this.checkQuestOverlap(
      questId,
      existing.eventDate,
      startTime,
      endTime,
      id,
    );

    const updated = await this.prisma.questReservation.update({
      where: { id },
      data: {
        questId,
        startTime,
        endTime,
      },
    });

    return this.formatQuestReservation(updated);
  }

  async cancelQuestReservation(id: string): Promise<void> {
    await this.prisma.questReservation.update({
      where: { id },
      data: { status: ReservationStatus.canceled },
    });
  }

  // ==================== QUICK BOOKING ====================

  async quickBookTable(dto: QuickTableBookingDto): Promise<QuickBookingResponse> {
    const duration = dto.durationMinutes || 120;
    
    // Validate duration is multiple of 30
    if (duration % 30 !== 0) {
      throw new BadRequestException('Duration must be a multiple of 30 minutes');
    }

    const eventDate = new Date(dto.eventDate);
    const startTime = this.stringToTime(dto.startTime);
    const endTime = this.addMinutesToDate(startTime, duration);

    // Check for overlaps
    try {
      await this.checkTableOverlap(dto.tableId, eventDate, startTime, endTime);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException('Слот занят (учтена уборка 15 минут)');
      }
      throw error;
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        branchId: dto.branchId,
        eventDate,
        clientName: dto.clientName || '',
        clientPhone: dto.clientPhone || '',
        depositRub: 0,
        status: BookingStatus.draft,
      },
    });

    // Create table reservation
    const title = dto.clientName?.trim() || 'Новая бронь';
    const reservation = await this.prisma.tableReservation.create({
      data: {
        bookingId: booking.id,
        tableId: dto.tableId,
        branchId: dto.branchId,
        eventDate,
        startTime,
        endTime,
        title,
        status: ReservationStatus.draft,
        cleaningBufferMinutes: 15,
      },
    });

    const blockedUntil = this.addMinutesToTime(
      this.timeToString(reservation.endTime),
      reservation.cleaningBufferMinutes,
    );

    return {
      booking: {
        id: booking.id,
        status: booking.status,
        eventDate: booking.eventDate.toISOString().split('T')[0],
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        depositRub: booking.depositRub,
      },
      reservation: {
        id: reservation.id,
        tableId: reservation.tableId,
        startTime: this.timeToString(reservation.startTime),
        endTime: this.timeToString(reservation.endTime),
        cleaningBufferMinutes: reservation.cleaningBufferMinutes,
        blockedUntilTime: blockedUntil,
      },
    };
  }

  async quickBookQuest(dto: QuickQuestBookingDto): Promise<QuickBookingResponse> {
    // Get quest duration if not provided
    let duration = dto.durationMinutes;
    if (!duration) {
      const quest = await this.prisma.quest.findUnique({
        where: { id: dto.questId },
        select: { durationMinutes: true },
      });
      if (!quest) {
        throw new NotFoundException('Quest not found');
      }
      duration = quest.durationMinutes;
    }

    // Validate duration is multiple of 30
    if (duration % 30 !== 0) {
      throw new BadRequestException('Duration must be a multiple of 30 minutes');
    }

    const eventDate = new Date(dto.eventDate);
    const startTime = this.stringToTime(dto.startTime);
    const endTime = this.addMinutesToDate(startTime, duration);

    // Check for overlaps
    try {
      await this.checkQuestOverlap(dto.questId, eventDate, startTime, endTime);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException('Слот занят');
      }
      throw error;
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        branchId: dto.branchId,
        eventDate,
        clientName: dto.clientName || '',
        clientPhone: dto.clientPhone || '',
        depositRub: 0,
        status: BookingStatus.draft,
      },
    });

    // Create quest reservation
    const title = dto.clientName?.trim() || 'Новая бронь';
    const reservation = await this.prisma.questReservation.create({
      data: {
        bookingId: booking.id,
        questId: dto.questId,
        branchId: dto.branchId,
        eventDate,
        startTime,
        endTime,
        title,
        status: ReservationStatus.draft,
      },
    });

    return {
      booking: {
        id: booking.id,
        status: booking.status,
        eventDate: booking.eventDate.toISOString().split('T')[0],
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        depositRub: booking.depositRub,
      },
      reservation: {
        id: reservation.id,
        questId: reservation.questId,
        startTime: this.timeToString(reservation.startTime),
        endTime: this.timeToString(reservation.endTime),
      },
    };
  }

  // ==================== HELPER METHODS ====================

  private validateTimeAlignment(startTime: string, endTime: string): void {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);

    // Check 30-minute alignment
    if (start.minutes % 30 !== 0 || end.minutes % 30 !== 0) {
      throw new BadRequestException('Time must be aligned to 30 minutes');
    }

    if (start.totalMinutes >= end.totalMinutes) {
      throw new BadRequestException('End time must be after start time');
    }
  }

  private async checkTableOverlap(
    tableId: string,
    eventDate: Date,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<void> {
    const existingReservations = await this.prisma.tableReservation.findMany({
      where: {
        tableId,
        eventDate,
        status: { not: ReservationStatus.canceled },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    const newStart = this.timeToMinutes(startTime);
    const newEnd = this.timeToMinutes(endTime);

    for (const existing of existingReservations) {
      const existingStart = this.timeToMinutes(existing.startTime);
      const existingEnd = this.timeToMinutes(existing.endTime);
      const existingBlockedUntil = existingEnd + existing.cleaningBufferMinutes;

      // Check if new reservation overlaps with [existingStart, existingBlockedUntil]
      if (newStart < existingBlockedUntil && newEnd > existingStart) {
        throw new BadRequestException(
          `Table is already reserved from ${this.timeToString(existing.startTime)} to ${this.addMinutesToTime(this.timeToString(existing.endTime), existing.cleaningBufferMinutes)}`,
        );
      }
    }
  }

  private async checkQuestOverlap(
    questId: string,
    eventDate: Date,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<void> {
    const existingReservations = await this.prisma.questReservation.findMany({
      where: {
        questId,
        eventDate,
        status: { not: ReservationStatus.canceled },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    const newStart = this.timeToMinutes(startTime);
    const newEnd = this.timeToMinutes(endTime);

    for (const existing of existingReservations) {
      const existingStart = this.timeToMinutes(existing.startTime);
      const existingEnd = this.timeToMinutes(existing.endTime);

      // Quests don't have cleaning buffer
      if (newStart < existingEnd && newEnd > existingStart) {
        throw new BadRequestException(
          `Quest is already reserved from ${this.timeToString(existing.startTime)} to ${this.timeToString(existing.endTime)}`,
        );
      }
    }
  }

  private formatTableReservation(reservation: any): TableReservationResponseDto {
    const blockedUntil = this.addMinutesToTime(
      this.timeToString(reservation.endTime),
      reservation.cleaningBufferMinutes,
    );
    return {
      id: reservation.id,
      bookingId: reservation.bookingId,
      tableId: reservation.tableId,
      title: reservation.title,
      comment: reservation.comment,
      status: reservation.status,
      eventDate: reservation.eventDate.toISOString().split('T')[0],
      startTime: this.timeToString(reservation.startTime),
      endTime: this.timeToString(reservation.endTime),
      cleaningBufferMinutes: reservation.cleaningBufferMinutes,
      blockedUntilTime: blockedUntil,
    };
  }

  private formatQuestReservation(reservation: any): QuestReservationResponseDto {
    return {
      id: reservation.id,
      bookingId: reservation.bookingId,
      questId: reservation.questId,
      title: reservation.title,
      animatorName: reservation.animatorName,
      comment: reservation.comment,
      status: reservation.status,
      startTime: this.timeToString(reservation.startTime),
      endTime: this.timeToString(reservation.endTime),
    };
  }

  private stringToTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private timeToString(time: Date): string {
    return time.toTimeString().slice(0, 5); // HH:MM
  }

  private parseTime(timeStr: string): { hours: number; minutes: number; totalMinutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
  }

  private timeToMinutes(time: Date): number {
    return time.getHours() * 60 + time.getMinutes();
  }

  private addMinutesToTime(timeStr: string, minutes: number): string {
    const parsed = this.parseTime(timeStr);
    const totalMinutes = parsed.totalMinutes + minutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private addMinutesToDate(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }
}
