import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { ClientsModule } from '../clients/clients.module';
import { QuestScheduleModule } from '../quest-schedule/quest-schedule.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [ClientsModule, QuestScheduleModule, WaitlistModule, NotificationsModule, ScheduleModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
