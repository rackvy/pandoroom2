import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(clientId: string, bookingId?: string) {
    const where: any = { clientId };
    if (bookingId) {
      where.bookingId = bookingId;
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        booking: {
          select: {
            id: true,
            eventDate: true,
            clientName: true,
            status: true,
          },
        },
      },
    });

    // Mark client messages as read (messages from admin/system)
    await this.prisma.chatMessage.updateMany({
      where: {
        clientId,
        sender: { in: ['admin', 'system'] },
        isRead: false,
      },
      data: { isRead: true },
    });

    return messages;
  }

  async sendMessage(clientId: string, text: string, bookingId?: string) {
    // Validate booking ownership if bookingId provided
    if (bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, clientId },
      });
      if (!booking) {
        throw new NotFoundException('Бронирование не найдено');
      }
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        clientId,
        bookingId: bookingId || null,
        sender: 'client',
        text,
        isRead: false, // unread for admin
      },
      include: {
        booking: {
          select: {
            id: true,
            eventDate: true,
            clientName: true,
            status: true,
          },
        },
      },
    });

    return message;
  }

  async getUnreadCount(clientId: string) {
    const count = await this.prisma.chatMessage.count({
      where: {
        clientId,
        sender: { in: ['admin', 'system'] },
        isRead: false,
      },
    });
    return { unread: count };
  }
}
