import { Injectable } from '@nestjs/common';
import { Namespace, Server } from 'socket.io';

/**
 * Nest отдаёт шлюзу не корневой сервер, а неймспейс (сервер создаётся через
 * adapter.create(...).of(namespace)), поэтому принимаем и то, и другое —
 * to(room).emit() есть у обоих.
 */
type ChatEvents = Server | Namespace;

/** Комната команды: непрочитанное общее на всех сотрудников, поэтому комната одна. */
export const STAFF_ROOM = 'staff:chat';

export function clientRoom(clientId: string): string {
  return `client:${clientId}`;
}

/**
 * Мост между сервисом переписки и Socket.IO: шлюз отдаёт сюда сервер в afterInit,
 * сервис шлёт через него события. Прямая инъекция шлюза в сервис дала бы кольцо,
 * а вебхуки и фоновые задачи работают вообще без сокетов — поэтому сервер
 * необязательный, и запись сообщения не падает там, где его нет.
 */
@Injectable()
export class ChatBroadcaster {
  private server: ChatEvents | null = null;

  attach(server: ChatEvents): void {
    this.server = server;
  }

  toClient(clientId: string, event: string, payload: unknown): void {
    this.server?.to(clientRoom(clientId)).emit(event, payload);
  }

  toStaff(event: string, payload: unknown): void {
    this.server?.to(STAFF_ROOM).emit(event, payload);
  }
}
