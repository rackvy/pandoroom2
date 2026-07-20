import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all conversations grouped by booking (for admin chat page)
   * Returns list of bookings with chat activity
   */
  async getConversations() {
    // Get all messages with bookingId
    const messagesWithBooking = await this.prisma.chatMessage.findMany({
      where: { bookingId: { not: null } },
      select: { bookingId: true },
      distinct: ['bookingId'],
    });

    const conversations = await Promise.all(
      messagesWithBooking.map(async ({ bookingId }) => {
        const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking) return null;

        // Get client info
        const client = booking.clientId
          ? await this.prisma.client.findUnique({
              where: { id: booking.clientId },
              select: { id: true, name: true, phone: true },
            })
          : null;

        const lastMessage = await this.prisma.chatMessage.findFirst({
          where: { bookingId },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await this.prisma.chatMessage.count({
          where: { bookingId, sender: 'client', isRead: false },
        });

        return {
          booking: {
            id: booking.id,
            eventDate: booking.eventDate,
            clientName: booking.clientName,
            clientPhone: booking.clientPhone,
            status: booking.status,
            questName: 'Квест', // Will be enriched if needed
          },
          client,
          lastMessage,
          unreadCount,
        };
      }),
    );

    // Filter out nulls and sort by last message date desc
    return conversations
      .filter((c) => c !== null)
      .sort((a, b) => {
        const dateA = a.lastMessage?.createdAt?.getTime() || 0;
        const dateB = b.lastMessage?.createdAt?.getTime() || 0;
        return dateB - dateA;
      });
  }

  /**
   * Get all messages for a specific booking
   */
  async getMessagesByBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Бронь не найдена');
    }

    // Get client info
    const client = booking.clientId
      ? await this.prisma.client.findUnique({
          where: { id: booking.clientId },
          select: { id: true, name: true, phone: true, email: true },
        })
      : null;

    const messages = await this.prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    // Mark client messages as read
    await this.prisma.chatMessage.updateMany({
      where: { bookingId, sender: 'client', isRead: false },
      data: { isRead: true },
    });

    return {
      booking: {
        id: booking.id,
        eventDate: booking.eventDate,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        status: booking.status,
        questName: 'Квест',
      },
      client,
      messages,
    };
  }

  /**
   * Get all messages for a specific client (legacy, for general chat)
   */
  async getMessages(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, phone: true, email: true },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where: { clientId },
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

    // Mark client messages as read
    await this.prisma.chatMessage.updateMany({
      where: { clientId, sender: 'client', isRead: false },
      data: { isRead: true },
    });

    return { client, messages };
  }

  /**
   * Admin sends a message to a client (for specific booking)
   */
  async sendMessage(clientId: string, text: string, bookingId?: string) {
    // Verify client exists
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new Error('Клиент не найден');
    }

    return this.prisma.chatMessage.create({
      data: {
        clientId,
        bookingId: bookingId || null,
        sender: 'admin',
        text,
        isRead: false, // unread for client
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
  }

  /**
   * Send a system notification to a client
   */
  async sendSystemMessage(clientId: string, text: string, bookingId?: string) {
    return this.prisma.chatMessage.create({
      data: {
        clientId,
        bookingId: bookingId || null,
        sender: 'system',
        text,
        isRead: false,
      },
    });
  }

  /**
   * Get total unread count across all bookings
   */
  async getTotalUnread() {
    const count = await this.prisma.chatMessage.count({
      where: { sender: 'client', isRead: false, bookingId: { not: null } },
    });
    return { unread: count };
  }
}
