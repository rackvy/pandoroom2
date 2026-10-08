import { Module } from '@nestjs/common';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { ClientsModule } from '../clients/clients.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ChatBroadcaster } from './chat-broadcaster';
import { ChatGateway } from './chat.gateway';
import { ChannelProbeService } from './channel-probe.service';
import { ChannelService } from './channel.service';
import { LkChatController } from './lk-chat.controller';
import { StaffChatController } from './staff-chat.controller';
import { WazzupWebhookController } from './wazzup-webhook.controller';
import { UnifiedChatService } from './unified-chat.service';

@Module({
  imports: [ClientAuthModule, ClientsModule, IntegrationsModule],
  controllers: [LkChatController, StaffChatController, WazzupWebhookController],
  providers: [UnifiedChatService, ChannelProbeService, ChannelService, ChatBroadcaster, ChatGateway],
  exports: [UnifiedChatService, ChannelService, ChannelProbeService],
})
export class ChatModule {}
