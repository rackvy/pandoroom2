import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Namespace, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatBroadcaster, STAFF_ROOM, clientRoom } from './chat-broadcaster';
import { UnifiedChatService } from './unified-chat.service';

const NAMESPACE = '/chat';

type Principal =
  | { kind: 'client'; clientId: string }
  | { kind: 'staff'; employeeId: string; label: string };

declare module 'socket.io' {
  interface Socket {
    principal?: Principal;
  }
}

interface ClientSendBody {
  text: string;
  bookingId?: string;
}

interface StaffSendBody {
  clientId: string;
  text: string;
  bookingId?: string;
}

interface StaffReadBody {
  clientId: string;
  bookingId?: string;
}

interface ClientReadBody {
  bookingId?: string;
}

/**
 * Шлюз только авторизует сокеты, раскладывает их по комнатам и делегирует запись
 * в UnifiedChatService — прямых обращений к Prisma здесь нет.
 *
 * Проверка токена сделана middleware соккет-сервера, а не обработчиком подключения:
 * в middleware отказ видно клиенту (connect_error), а если отключать уже внутри
 * handleConnection, клиент успевает получить «connect» и считает себя в системе.
 * Middleware вешается на аргумент afterInit: шлюз объявил namespace, и Nest при
 * таком объявлении отдаёт ему сам неймспейс, а не корневой Server.
 *
 * Комнат две: client:{id} и staff:chat. Прежних комнат по каждой брони больше нет,
 * вместе с ними ушёл и запрос списка броней на каждое подключение. Фильтрация по
 * bookingId остаётся на клиенте, как и раньше.
 */
@WebSocketGateway({
  namespace: NAMESPACE,
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chat: UnifiedChatService,
    private readonly broadcaster: ChatBroadcaster,
  ) {}

  afterInit(namespace: Namespace): void {
    this.broadcaster.attach(namespace);

    namespace.use((socket: Socket, next: (err?: Error) => void) => {
      const principal = this.authenticate(socket);
      if (!principal) {
        next(new Error('Требуется действующий токен'));
        return;
      }
      socket.principal = principal;
      next();
    });
  }

  handleConnection(socket: Socket): void {
    const principal = socket.principal;
    if (!principal) {
      socket.disconnect();
      return;
    }

    socket.join(principal.kind === 'client' ? clientRoom(principal.clientId) : STAFF_ROOM);
    this.logger.log(
      principal.kind === 'client'
        ? `Клиент ${principal.clientId} подключился (${socket.id})`
        : `Сотрудник ${principal.label} подключился (${socket.id})`,
    );
  }

  handleDisconnect(socket: Socket): void {
    const principal = socket.principal;
    if (principal) {
      this.logger.log(`${principal.kind} ${socket.id} отключился`);
    }
  }

  /** Клиент пишет из личного кабинета. */
  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ClientSendBody,
  ) {
    const principal = this.asClient(socket);
    if (!principal) return;

    return this.run(socket, async () => {
      const bookingId = data?.bookingId ?? null;
      if (bookingId) {
        await this.chat.assertBookingBelongsToClient(bookingId, principal.clientId);
      }
      return this.chat.appendMessage({
        clientId: principal.clientId,
        text: data?.text,
        bookingId,
        direction: 'INBOUND',
      });
    });
  }

  /** Сотрудник пишет клиенту. */
  @SubscribeMessage('admin:message:send')
  async handleStaffMessageSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: StaffSendBody,
  ) {
    const principal = this.asStaff(socket);
    if (!principal) return;
    if (!data?.clientId) {
      this.emitFailure(socket, 'Не указан клиент');
      return;
    }

    return this.run(socket, () =>
      this.chat.appendMessage({
        clientId: data.clientId,
        text: data.text,
        bookingId: data.bookingId ?? null,
        direction: 'OUTBOUND',
        authorId: principal.employeeId,
      }),
    );
  }

  /** Сотрудник открыл диалог: непрочитанное гаснет у всей команды. */
  @SubscribeMessage('admin:message:read')
  async handleStaffMessageRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: StaffReadBody,
  ) {
    const principal = this.asStaff(socket);
    if (!principal) return;

    return this.run(socket, () =>
      this.chat.markReadByStaff(data?.clientId || undefined, data?.bookingId ?? null),
    );
  }

  /** Клиент открыл чат. */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data?: ClientReadBody,
  ) {
    const principal = this.asClient(socket);
    if (!principal) return;

    return this.run(socket, () =>
      this.chat.markReadByClient(principal.clientId, data?.bookingId ?? null),
    );
  }

  private authenticate(socket: Socket): Principal | null {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return null;

    try {
      const payload = this.jwtService.verify(token);
      if (payload.userType === 'client') {
        return { kind: 'client', clientId: payload.sub };
      }
      if (payload.role) {
        return { kind: 'staff', employeeId: payload.sub, label: payload.email || payload.sub };
      }
      return null;
    } catch {
      return null;
    }
  }

  private asClient(socket: Socket) {
    const principal = socket.principal;
    return principal && principal.kind === 'client' ? principal : null;
  }

  private asStaff(socket: Socket) {
    const principal = socket.principal;
    return principal && principal.kind === 'staff' ? principal : null;
  }

  /**
   * Глобальный ValidationPipe к веб-сокетам не применяется, поэтому ошибки
   * разбора ловим здесь и возвращаем отправителю, а не роняем обработчик.
   */
  private async run<T>(socket: Socket, action: () => Promise<T>): Promise<T | undefined> {
    try {
      return await action();
    } catch (err) {
      this.emitFailure(socket, err?.message || 'Не удалось обработать сообщение');
      return undefined;
    }
  }

  private emitFailure(socket: Socket, message: string): void {
    this.logger.warn(`Сокет ${socket.id}: ${message}`);
    socket.emit('chat:error', { message });
  }
}
