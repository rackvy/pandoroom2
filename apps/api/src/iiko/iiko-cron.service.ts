import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IikoService } from './iiko.service';

@Injectable()
export class IikoCronService {
  private readonly logger = new Logger(IikoCronService.name);

  constructor(private iiko: IikoService) {}

  // iiko периодически меняет CDN фотографий меню — без регулярного
  // обновления сохраненные ссылки протухают (404) и сайт остается без фото
  @Cron('0 6 * * *', { timeZone: 'Asia/Vladivostok' })
  async syncMenu() {
    const result = await this.iiko.syncMenu();
    this.logger.log(`Плановая синхронизация меню iiko: ${result.message}`);
  }
}
