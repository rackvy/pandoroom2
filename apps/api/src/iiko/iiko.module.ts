import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IikoService } from './iiko.service';
import { IikoController } from './iiko.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IikoController],
  providers: [IikoService],
  exports: [IikoService],
})
export class IikoModule {}
