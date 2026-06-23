import { Controller, Post, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeeRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('api/admin/google-calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class GoogleCalendarController {
  constructor(private readonly gcalService: GoogleCalendarService) {}

  @Post('sync/:bookingId')
  syncBooking(@Param('bookingId') bookingId: string) {
    return this.gcalService.syncBookingToCalendar(bookingId);
  }

  @Post('sync-all')
  syncAll(@Query('date') date: string) {
    return this.gcalService.syncAllByDate(date);
  }
}
