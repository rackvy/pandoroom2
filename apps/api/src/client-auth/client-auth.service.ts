import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ClientLoginDto } from './dto/client-login.dto';

// Temporary hardcoded password for all clients
const TEMP_PASSWORD = '2424';

@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: ClientLoginDto) {
    // Normalize phone: strip all non-digits
    const phone = dto.phone.replace(/\D/g, '');

    // Find existing client first
    const existing = await this.prisma.client.findUnique({ where: { phone } });

    // Check password (temporary: everyone uses 2424)
    if (dto.password !== TEMP_PASSWORD) {
      if (existing?.passwordHash) {
        const isValid = await bcrypt.compare(dto.password, existing.passwordHash);
        if (!isValid) {
          throw new UnauthorizedException('Неверный телефон или пароль');
        }
      } else {
        throw new UnauthorizedException('Неверный телефон или пароль');
      }
    }

    // Use existing client or auto-register new one
    const client = existing || await this.prisma.client.create({
      data: {
        phone,
        name: 'Новый клиент',
        passwordHash: await bcrypt.hash(TEMP_PASSWORD, 10),
      },
    });

    if (!existing) {
      this.logger.log(`Auto-registered new client: ${phone}`);
    }

    const payload = {
      sub: client.id,
      phone: client.phone,
      userType: 'client',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      client: {
        id: client.id,
        phone: client.phone,
        name: client.name,
        email: client.email,
        birthday: client.birthday,
      },
    };
  }

  async getProfile(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
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
      throw new UnauthorizedException('Клиент не найден');
    }

    return {
      id: client.id,
      phone: client.phone,
      name: client.name,
      email: client.email,
      birthday: client.birthday,
      bookings: client.bookings,
      questReservations: client.questReservations,
    };
  }

  async updateProfile(clientId: string, data: { name?: string; email?: string; birthday?: string }) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new UnauthorizedException('Клиент не найден');
    }

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.birthday !== undefined && { birthday: data.birthday ? new Date(data.birthday) : null }),
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        birthday: true,
      },
    });
  }
}
