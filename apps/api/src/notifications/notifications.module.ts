import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CronService } from './cron.service';
import { TelegramChannel } from './channels/telegram.channel';
import { SmsChannel } from './channels/sms.channel';
import { MaxChannel } from './channels/max.channel';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, CronService, TelegramChannel, SmsChannel, MaxChannel],
  exports: [NotificationsService],
})
export class NotificationsModule {}
