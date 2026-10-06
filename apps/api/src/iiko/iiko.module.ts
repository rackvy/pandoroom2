import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { IikoService } from './iiko.service';
import { IikoController } from './iiko.controller';
import { IikoCronService } from './iiko-cron.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [IikoController],
  providers: [IikoService, IikoCronService],
  exports: [IikoService],
})
export class IikoModule {}
