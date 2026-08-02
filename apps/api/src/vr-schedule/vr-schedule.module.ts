import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientsModule } from '../clients/clients.module';
import { VRScheduleService } from './vr-schedule.service';
import { VRScheduleController } from './vr-schedule.controller';
import { VRSchedulePublicController } from './vr-schedule-public.controller';

@Module({
  imports: [PrismaModule, ClientsModule],
  controllers: [VRScheduleController, VRSchedulePublicController],
  providers: [VRScheduleService],
  exports: [VRScheduleService],
})
export class VRScheduleModule {}
