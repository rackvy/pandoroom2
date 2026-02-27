import { Module } from '@nestjs/common';
import { QuestScheduleController } from './quest-schedule.controller';
import { QuestScheduleService } from './quest-schedule.service';

@Module({
  controllers: [QuestScheduleController],
  providers: [QuestScheduleService],
})
export class QuestScheduleModule {}
