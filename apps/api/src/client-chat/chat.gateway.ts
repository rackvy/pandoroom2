import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Map socket.id → { userId, userType, room }
  private connections = new Map<string, { userId: string; userType: string }>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Socket ${socket.id}: no token, disconnecting`);
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);

      if (payload.userType === 'client') {
        // Client connection
        const room = `client:${payload.sub}`;
        socket.join(room);
        this.connections.set(socket.id, { userId: payload.sub, userType: 'client' });
        this.logger.log(`Client ${payload.sub} connected (${socket.id})`);
      } else if (payload.role) {
        // Admin/employee connection
        socket.join('admin:chat');
        this.connections.set(socket.id, { userId: payload.sub, userType: 'admin' });
        this.logger.log(`Admin ${payload.email || payload.sub} connected (${socket.id})`);
      } else {
        this.logger.warn(`Socket ${socket.id}: unknown token type, disconnecting`);
        socket.disconnect();
      }
    } catch (err) {
      this.logger.warn(`Socket ${socket.id}: auth failed — ${err.message}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const info = this.connections.get(socket.id);
    if (info) {
      this.logger.log(`${info.userType} ${info.userId} disconnected (${socket.id})`);
      this.connections.delete(socket.id);
    }
  }

  /**
   * Client sends a new message
   */
  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { text: string; bookingId?: string },
  ) {
    const info = this.connections.get(socket.id);
    if (!info || info.userType !== 'client') return;

    const message = await this.prisma.chatMessage.create({
      data: {
        clientId: info.userId,
        bookingId: data.bookingId || null,
        sender: 'client',
        text: data.text,
        isRead: false,
      },
      include: {
        booking: {
          select: { id: true, eventDate: true, clientName: true, status: true },
        },
      },
    });

    // Send back to the client (confirm)
    socket.emit('message:new', message);

    // Broadcast to all admin connections
    this.server.to('admin:chat').emit('message:new', {
      ...message,
      client: await this.getClientInfo(info.userId),
    });

    // Update admin unread count
    const unread = await this.prisma.chatMessage.count({
      where: { sender: 'client', isRead: false },
    });
    this.server.to('admin:chat').emit('unread:update', { unread });
  }

  /**
   * Admin sends a message to a client
   */
  @SubscribeMessage('admin:message:send')
  async handleAdminMessageSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { clientId: string; text: string; bookingId?: string },
  ) {
    const info = this.connections.get(socket.id);
    if (!info || info.userType !== 'admin') return;

    const message = await this.prisma.chatMessage.create({
      data: {
        clientId: data.clientId,
        bookingId: data.bookingId || null,
        sender: 'admin',
        text: data.text,
        isRead: false,
      },
      include: {
        booking: {
          select: { id: true, eventDate: true, clientName: true, status: true },
        },
      },
    });

    // Broadcast to all admin connections (including sender)
    this.server.to('admin:chat').emit('message:new', {
      ...message,
      client: await this.getClientInfo(data.clientId),
    });

    // Send to the specific client room
    this.server.to(`client:${data.clientId}`).emit('message:new', message);

    // Update client unread count
    const unread = await this.prisma.chatMessage.count({
      where: { clientId: data.clientId, sender: { in: ['admin', 'system'] }, isRead: false },
    });
    this.server.to(`client:${data.clientId}`).emit('unread:update', { unread });
  }

  /**
   * Admin reads a client's messages — mark as read
   */
  @SubscribeMessage('admin:message:read')
  async handleAdminMessageRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { clientId: string },
  ) {
    const info = this.connections.get(socket.id);
    if (!info || info.userType !== 'admin') return;

    await this.prisma.chatMessage.updateMany({
      where: { clientId: data.clientId, sender: 'client', isRead: false },
      data: { isRead: true },
    });

    // Update admin unread totals
    const unread = await this.prisma.chatMessage.count({
      where: { sender: 'client', isRead: false },
    });
    this.server.to('admin:chat').emit('unread:update', { unread });
  }

  /**
   * Client reads messages
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(@ConnectedSocket() socket: Socket) {
    const info = this.connections.get(socket.id);
    if (!info || info.userType !== 'client') return;

    await this.prisma.chatMessage.updateMany({
      where: { clientId: info.userId, sender: { in: ['admin', 'system'] }, isRead: false },
      data: { isRead: true },
    });

    this.server.to(`client:${info.userId}`).emit('unread:update', { unread: 0 });
  }

  private async getClientInfo(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, phone: true },
    });
    return client;
  }
}
