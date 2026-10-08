import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentClient, ClientUserPayload } from '../common/decorators/current-client.decorator';
import { Client } from '../common/decorators/client.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ClientGuard } from '../common/guards/client.guard';
import { FeedQueryDto } from './dto/feed-query.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UnifiedChatService } from './unified-chat.service';

/**
 * Чат личного кабинета: одна лента на все каналы, счётчик непрочитанного и
 * отправка. Прежние «плоский список» и «список чатов по броням» удалены вместе
 * с их потребителями — лента отдаётся через feed с курсором, а пометка о
 * прочтении живёт отдельным событием сокета, а не побочным эффектом чтения.
 */
@Controller('api/lk/chat')
@UseGuards(ClientGuard)
export class LkChatController {
  constructor(private readonly chat: UnifiedChatService) {}

  @Get('feed')
  @Public()
  @Client()
  getFeed(@CurrentClient() user: ClientUserPayload, @Query() query: FeedQueryDto) {
    return this.chat.getFeed(user.userId, query);
  }

  @Get('unread')
  @Public()
  @Client()
  async getUnreadCount(@CurrentClient() user: ClientUserPayload) {
    return { unread: await this.chat.unreadForClient(user.userId) };
  }

  @Post()
  @Public()
  @Client()
  async sendMessage(
    @CurrentClient() user: ClientUserPayload,
    @Body() dto: SendChatMessageDto,
  ) {
    if (dto.bookingId) {
      await this.chat.assertBookingBelongsToClient(dto.bookingId, user.userId);
    }
    return this.chat.appendMessage({
      clientId: user.userId,
      text: dto.text,
      bookingId: dto.bookingId ?? null,
      direction: 'INBOUND',
    });
  }
}
