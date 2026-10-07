import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientsModule } from '../clients/clients.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuestScheduleModule } from '../quest-schedule/quest-schedule.module';

@Module({
  imports: [PrismaModule, ClientsModule, WaitlistModule, NotificationsModule, QuestScheduleModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
