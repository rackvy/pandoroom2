import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VRScheduleService } from './vr-schedule.service';
import { VRScheduleController } from './vr-schedule.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VRScheduleController],
  providers: [VRScheduleService],
  exports: [VRScheduleService],
})
export class VRScheduleModule {}
