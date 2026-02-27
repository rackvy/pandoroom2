import { Controller, Get } from '@nestjs/common';
import { QuestsService } from './quests.service.js';

@Controller('quests')
export class QuestsController {
  constructor(private questsService: QuestsService) {}

  @Get()
  findAll() {
    return this.questsService.findAll();
  }
}
