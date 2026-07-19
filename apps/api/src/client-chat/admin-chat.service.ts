import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all conversations (grouped by client), showing last message and unread count
   */
  async getConversations() {
    // Get all clients that have at least one chat message
    const clientsWithMessages = await this.prisma.chatMessage.findMany({
      select: { clientId: true },
      distinct: ['clientId'],
    });

    const conversations = await Promise.all(
      clientsWithMessages.map(async ({ clientId }) => {
        const client = await this.prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, phone: true },
        });

        const lastMessage = await this.prisma.chatMessage.findFirst({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await this.prisma.chatMessage.count({
          where: { clientId, sender: 'client', isRead: false },
        });

        return {
          client,
          lastMessage,
          unreadCount,
        };
      }),
    );

    // Sort by last message date desc
    return conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt?.getTime() || 0;
      const dateB = b.lastMessage?.createdAt?.getTime() || 0;
      return dateB - dateA;
    });
  }

  /**
   * Get all messages for a specific client
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
   * Admin sends a message to a client
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
   * Get total unread count across all clients
   */
  async getTotalUnread() {
    const count = await this.prisma.chatMessage.count({
      where: { sender: 'client', isRead: false },
    });
    return { unread: count };
  }
}
