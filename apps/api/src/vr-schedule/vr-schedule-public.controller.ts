import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { VRScheduleService } from './vr-schedule.service';

@Controller('api/public/vr-schedule')
@Public()
export class VRSchedulePublicController {
  constructor(private readonly vrScheduleService: VRScheduleService) {}

  /** Free seats + price per 30-min slot for each active hall of the branch */
  @Get('availability')
  getAvailability(@Query('branchId') branchId: string, @Query('date') date: string) {
    if (!branchId || !date) {
      throw new BadRequestException('Укажите филиал и дату');
    }
    return this.vrScheduleService.getAvailability(branchId, date);
  }

  /** Buyout price for the given time range */
  @Get('price')
  getPrice(
    @Query('hallId') hallId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    if (!hallId || !date || !startTime || !endTime) {
      throw new BadRequestException('Укажите зал, дату и время');
    }
    return this.vrScheduleService.getPrice(hallId, date, startTime, endTime);
  }

  /** Public booking request (status: draft, admin confirms) */
  @Post('bookings')
  createBooking(
    @Body()
    body: {
      hallId: string;
      date: string;
      startTime: string;
      endTime: string;
      guestsCount?: number;
      buyout?: boolean;
      clientName: string;
      clientPhone: string;
      gameId?: string;
    },
  ) {
    if (!body.hallId || !body.date || !body.startTime || !body.endTime) {
      throw new BadRequestException('Выберите дату и время');
    }
    if (!body.clientName || !body.clientName.trim()) {
      throw new BadRequestException('Укажите имя');
    }
    if (!body.clientPhone || !body.clientPhone.trim()) {
      throw new BadRequestException('Укажите телефон');
    }

    return this.vrScheduleService.createReservation(
      {
        hallId: body.hallId,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        type: body.buyout ? 'full_hall' : 'open_slot',
        guestsCount: body.buyout ? undefined : Number(body.guestsCount) || 1,
        clientName: body.clientName.trim(),
        clientPhone: body.clientPhone.trim(),
        gameId: body.gameId || undefined,
      },
      'draft',
    );
  }
}
