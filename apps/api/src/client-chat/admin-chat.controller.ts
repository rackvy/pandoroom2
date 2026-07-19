import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AdminChatService } from './admin-chat.service';

@Controller('api/admin/chat')
export class AdminChatController {
  constructor(private adminChatService: AdminChatService) {}

  @Get('conversations')
  getConversations() {
    return this.adminChatService.getConversations();
  }

  @Get('unread')
  getTotalUnread() {
    return this.adminChatService.getTotalUnread();
  }

  @Get(':clientId')
  getMessages(@Param('clientId') clientId: string) {
    return this.adminChatService.getMessages(clientId);
  }

  @Post(':clientId')
  sendMessage(
    @Param('clientId') clientId: string,
    @Body() data: { text: string; bookingId?: string },
  ) {
    return this.adminChatService.sendMessage(clientId, data.text, data.bookingId);
  }

  @Post(':clientId/system')
  sendSystemMessage(
    @Param('clientId') clientId: string,
    @Body() data: { text: string; bookingId?: string },
  ) {
    return this.adminChatService.sendSystemMessage(clientId, data.text, data.bookingId);
  }
}
