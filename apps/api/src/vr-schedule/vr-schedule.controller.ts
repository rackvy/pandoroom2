import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EmployeeRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { VRScheduleService } from './vr-schedule.service';
import { CreateVRReservationDto } from './dto/create-vr-reservation.dto';
import { MoveVRReservationDto } from './dto/move-vr-reservation.dto';

@Controller('api/admin/vr-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class VRScheduleController {
  constructor(private readonly vrScheduleService: VRScheduleService) {}

  @Get('halls')
  getHalls(@Query('branchId') branchId: string) {
    return this.vrScheduleService.getHalls(branchId);
  }

  @Post('halls')
  createHall(@Body() body: { branchId: string; name: string; maxCapacity?: number }) {
    return this.vrScheduleService.createHall(body);
  }

  @Patch('halls/:id')
  updateHall(@Param('id') id: string, @Body() body: any) {
    return this.vrScheduleService.updateHall(id, body);
  }

  @Delete('halls/:id')
  deleteHall(@Param('id') id: string) {
    return this.vrScheduleService.deleteHall(id);
  }

  @Get('schedule')
  getSchedule(@Query('branchId') branchId: string, @Query('date') date: string) {
    return this.vrScheduleService.getSchedule(branchId, date);
  }

  @Post('reservations')
  @UsePipes(new ValidationPipe({ transform: true }))
  createReservation(@Body() dto: CreateVRReservationDto) {
    return this.vrScheduleService.createReservation(dto);
  }

  @Patch('reservations/:id/move')
  @UsePipes(new ValidationPipe({ transform: true }))
  moveReservation(@Param('id') id: string, @Body() dto: MoveVRReservationDto) {
    return this.vrScheduleService.moveReservation(id, dto);
  }

  @Patch('reservations/:id/cancel')
  cancelReservation(@Param('id') id: string) {
    return this.vrScheduleService.cancelReservation(id);
  }

  @Delete('reservations/:id')
  deleteReservation(@Param('id') id: string) {
    return this.vrScheduleService.deleteReservation(id);
  }
}
