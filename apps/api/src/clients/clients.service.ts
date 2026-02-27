import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            bookings: true,
            questReservations: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { eventDate: 'desc' },
          include: {
            branch: true,
            tableReservations: {
              include: { table: { include: { zone: true } } },
            },
            questReservations: {
              include: { quest: true },
            },
          },
        },
        questReservations: {
          orderBy: { eventDate: 'desc' },
          include: {
            quest: true,
            branch: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return client;
  }

  async findByPhone(phone: string) {
    return this.prisma.client.findUnique({
      where: { phone },
    });
  }

  async create(data: CreateClientDto) {
    // Check if phone already exists
    const existing = await this.prisma.client.findUnique({
      where: { phone: data.phone },
    });

    if (existing) {
      throw new ConflictException('Клиент с таким телефоном уже существует');
    }

    return this.prisma.client.create({
      data: {
        ...data,
        birthday: data.birthday ? new Date(data.birthday) : null,
      },
    });
  }

  async update(id: string, data: UpdateClientDto) {
    await this.findOne(id);

    // Check phone uniqueness if updating phone
    if (data.phone) {
      const existing = await this.prisma.client.findUnique({
        where: { phone: data.phone },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Клиент с таким телефоном уже существует');
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...data,
        birthday: data.birthday ? new Date(data.birthday) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.client.delete({ where: { id } });
    return { message: 'Клиент удален' };
  }

  // Get or create client by phone (used when creating bookings)
  async getOrCreate(phone: string, name: string) {
    const existing = await this.prisma.client.findUnique({
      where: { phone },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.client.create({
      data: { phone, name },
    });
  }
}
