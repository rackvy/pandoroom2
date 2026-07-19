import { Module } from '@nestjs/common';
import { ClientChatService } from './client-chat.service';
import { ClientChatController } from './client-chat.controller';
import { AdminChatService } from './admin-chat.service';
import { AdminChatController } from './admin-chat.controller';
import { ClientAuthModule } from '../client-auth/client-auth.module';

@Module({
  imports: [ClientAuthModule],
  controllers: [ClientChatController, AdminChatController],
  providers: [ClientChatService, AdminChatService],
  exports: [ClientChatService, AdminChatService],
})
export class ClientChatModule {}
