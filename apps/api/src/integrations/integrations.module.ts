import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ChannelRegistry } from './channels/channel-registry';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ChannelRegistry],
  exports: [IntegrationsService, ChannelRegistry],
})
export class IntegrationsModule {}
