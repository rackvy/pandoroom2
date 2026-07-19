import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ClientChatService } from './client-chat.service';
import { Public } from '../common/decorators/public.decorator';
import { Client } from '../common/decorators/client.decorator';
import { CurrentClient, ClientUserPayload } from '../common/decorators/current-client.decorator';
import { ClientGuard } from '../common/guards/client.guard';

@Controller('api/lk/chat')
@UseGuards(ClientGuard)
export class ClientChatController {
  constructor(private chatService: ClientChatService) {}

  @Get()
  @Public()
  @Client()
  async getMessages(
    @CurrentClient() user: ClientUserPayload,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.chatService.getMessages(user.userId, bookingId);
  }

  @Post()
  @Public()
  @Client()
  async sendMessage(
    @CurrentClient() user: ClientUserPayload,
    @Body() data: { text: string; bookingId?: string },
  ) {
    return this.chatService.sendMessage(user.userId, data.text, data.bookingId);
  }

  @Get('unread')
  @Public()
  @Client()
  async getUnreadCount(@CurrentClient() user: ClientUserPayload) {
    return this.chatService.getUnreadCount(user.userId);
  }
}
