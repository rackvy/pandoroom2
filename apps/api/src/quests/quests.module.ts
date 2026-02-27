import { Module } from '@nestjs/common';
import { QuestsService } from './quests.service.js';
import { QuestsController } from './quests.controller.js';

@Module({
  controllers: [QuestsController],
  providers: [QuestsService],
})
export class QuestsModule {}
