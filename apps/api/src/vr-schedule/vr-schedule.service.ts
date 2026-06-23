import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VRScheduleService {
  private readonly logger = new Logger(VRScheduleService.name);

  constructor(private prisma: PrismaService) {}

  async getHalls(branchId: string) {
    return this.prisma.vRHall.findMany({
      where: { branchId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { reservations: true },
    });
  }

  async createHall(data: { branchId: string; name: string; maxCapacity?: number }) {
    return this.prisma.vRHall.create({ data });
  }

  async updateHall(id: string, data: any) {
    const hall = await this.prisma.vRHall.findUnique({ where: { id } });
    if (!hall) {
      throw new NotFoundException('VR-зал не найден');
    }
    return this.prisma.vRHall.update({ where: { id }, data });
  }

  async deleteHall(id: string) {
    const hall = await this.prisma.vRHall.findUnique({ where: { id } });
    if (!hall) {
      throw new NotFoundException('VR-зал не найден');
    }
    return this.prisma.vRHall.delete({ where: { id } });
  }

  async getSchedule(branchId: string, date: string) {
    const halls = await this.prisma.vRHall.findMany({
      where: { branchId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        reservations: {
          where: { date: new Date(date) },
          include: { game: true, booking: { include: { client: true } } },
        },
      },
    });
    return halls;
  }

  async createReservation(data: any) {
    // Verify hall exists
    const hall = await this.prisma.vRHall.findUnique({ where: { id: data.hallId } });
    if (!hall) {
      throw new NotFoundException('VR-зал не найден');
    }

    // Check for time overlaps
    const startTime = new Date(`1970-01-01T${data.startTime}`);
    const endTime = new Date(`1970-01-01T${data.endTime}`);

    const overlapping = await this.prisma.vRReservation.findFirst({
      where: {
        hallId: data.hallId,
        date: new Date(data.date),
        status: { not: 'canceled' },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (overlapping) {
      throw new ConflictException('Время пересекается с существующей бронью');
    }

    return this.prisma.vRReservation.create({
      data: {
        hallId: data.hallId,
        date: new Date(data.date),
        startTime,
        endTime,
        type: data.type,
        title: data.title,
        description: data.description,
        gameId: data.gameId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        guestsCount: data.guestsCount || 0,
        maxGuests: data.maxGuests,
        bookingId: data.bookingId,
        status: 'confirmed',
      },
      include: { game: true, hall: true },
    });
  }

  async moveReservation(id: string, data: any) {
    const reservation = await this.prisma.vRReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Бронь не найдена');
    }

    const updateData: any = {};
    if (data.hallId) updateData.hallId = data.hallId;
    if (data.date) updateData.date = new Date(data.date);
    if (data.startTime) updateData.startTime = new Date(`1970-01-01T${data.startTime}`);
    if (data.endTime) updateData.endTime = new Date(`1970-01-01T${data.endTime}`);

    return this.prisma.vRReservation.update({
      where: { id },
      data: updateData,
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

  async deleteReservation(id: string) {
    const reservation = await this.prisma.vRReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Бронь не найдена');
    }
    return this.prisma.vRReservation.delete({ where: { id } });
  }
}
