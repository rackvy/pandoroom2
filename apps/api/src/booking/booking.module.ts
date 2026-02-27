import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { ClientsService } from '../clients/clients.service';

@Module({
  controllers: [BookingController],
  providers: [BookingService, ClientsService],
  exports: [BookingService],
})
export class BookingModule {}
