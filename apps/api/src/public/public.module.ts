import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { QuestScheduleModule } from '../quest-schedule/quest-schedule.module';

@Module({
  imports: [QuestScheduleModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
