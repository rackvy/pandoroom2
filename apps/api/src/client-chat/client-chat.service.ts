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
    const readWhere: any = {
      clientId,
      sender: { in: ['admin', 'system'] },
      isRead: false,
    };
    if (bookingId) {
      readWhere.bookingId = bookingId;
    }
    await this.prisma.chatMessage.updateMany({
      where: readWhere,
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

  async getBookingsWithChatInfo(clientId: string) {
    // Get all bookings for this client that have at least one chat message
    const messagesWithBooking = await this.prisma.chatMessage.findMany({
      where: { clientId, bookingId: { not: null } },
      select: { bookingId: true },
      distinct: ['bookingId'],
    });

    const bookingIds = messagesWithBooking.map(m => m.bookingId!).filter(Boolean);

    if (bookingIds.length === 0) {
      // Also check for bookings without messages
      const allBookings = await this.prisma.booking.findMany({
        where: { clientId },
        select: { id: true, eventDate: true, clientName: true, status: true },
        orderBy: { eventDate: 'desc' },
        take: 20,
      });
      return allBookings.map(b => ({
        booking: b,
        lastMessage: null,
        unreadCount: 0,
      }));
    }

    const results = await Promise.all(
      bookingIds.map(async (bookingId) => {
        const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          select: { id: true, eventDate: true, clientName: true, status: true },
        });

        const lastMessage = await this.prisma.chatMessage.findFirst({
          where: { bookingId },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            bookingId,
            clientId,
            sender: { in: ['admin', 'system'] },
            isRead: false,
          },
        });

        return { booking, lastMessage, unreadCount };
      }),
    );

    // Also include bookings without messages
    const bookingsWithMessages = new Set(bookingIds);
    const otherBookings = await this.prisma.booking.findMany({
      where: { clientId, id: { notIn: [...bookingsWithMessages] } },
      select: { id: true, eventDate: true, clientName: true, status: true },
      orderBy: { eventDate: 'desc' },
      take: 10,
    });

    const allResults = [
      ...results,
      ...otherBookings.map(b => ({ booking: b, lastMessage: null, unreadCount: 0 })),
    ];

    return allResults.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt?.getTime() || 0;
      const dateB = b.lastMessage?.createdAt?.getTime() || 0;
      return dateB - dateA;
    });
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
