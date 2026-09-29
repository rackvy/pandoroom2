import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { ClientLoginDto } from './dto/client-login.dto';
import { isValidPhone, normalizePhone } from './phone';

@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  async login(dto: ClientLoginDto) {
    const phone = normalizePhone(dto.phone);
    if (!isValidPhone(phone)) {
      throw new UnauthorizedException('Неверный формат номера');
    }

    await this.otpService.verifyAndConsume(phone, dto.code);

    // Неизвестный номер регистрируется: факт владения телефоном подтверждён кодом
    const existing = await this.prisma.client.findUnique({ where: { phone } });
    const client =
      existing ||
      (await this.prisma.client.create({
        data: { phone, name: 'Новый клиент' },
      }));

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
              include: {
                quest: { include: { previewImage: true } },
                branch: true,
              },
            },
          },
        },
        vrReservations: {
          orderBy: { date: 'desc' },
          include: {
            hall: true,
            game: { include: { previewImage: true } },
          },
        },
      },
    });

    if (!client) {
      throw new UnauthorizedException('Клиент не найден');
    }

    // Build questReservations from bookings (QuestReservation.clientId is not populated,
    // so we go through Booking.clientId which is always set correctly)
    const questReservations = client.bookings
      .flatMap(b => b.questReservations)
      .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

    return {
      id: client.id,
      phone: client.phone,
      name: client.name,
      email: client.email,
      birthday: client.birthday,
      bookings: client.bookings,
      questReservations,
      vrReservations: client.vrReservations,
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
