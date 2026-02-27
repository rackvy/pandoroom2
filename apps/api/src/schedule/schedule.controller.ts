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
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployeeRole } from '@prisma/client';
import { ScheduleService } from './schedule.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import {
  CreateTableReservationDto,
  MoveTableReservationDto,
} from './dto/table-reservation.dto';
import {
  CreateQuestReservationDto,
  MoveQuestReservationDto,
} from './dto/quest-reservation.dto';
import {
  QuickTableBookingDto,
  QuickQuestBookingDto,
} from './dto/quick-booking.dto';

@Controller('api/admin/schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  // ==================== TABLE SCHEDULE ====================

  @Get('tables')
  async getTablesSchedule(@Query() query: ScheduleQueryDto) {
    return this.scheduleService.getTablesSchedule(query.branchId, query.date);
  }

  @Post('table-reservations')
  async createTableReservation(@Body() dto: CreateTableReservationDto) {
    return this.scheduleService.createTableReservation(dto);
  }

  @Patch('table-reservations/:id/move')
  async moveTableReservation(
    @Param('id') id: string,
    @Body() dto: MoveTableReservationDto,
  ) {
    return this.scheduleService.moveTableReservation(id, dto);
  }

  @Delete('table-reservations/:id')
  async cancelTableReservation(@Param('id') id: string) {
    await this.scheduleService.cancelTableReservation(id);
    return { success: true };
  }

  // ==================== QUEST SCHEDULE ====================

  @Get('quests')
  async getQuestsSchedule(@Query() query: ScheduleQueryDto) {
    return this.scheduleService.getQuestsSchedule(query.branchId, query.date);
  }

  @Post('quest-reservations')
  async createQuestReservation(@Body() dto: CreateQuestReservationDto) {
    return this.scheduleService.createQuestReservation(dto);
  }

  @Patch('quest-reservations/:id/move')
  async moveQuestReservation(
    @Param('id') id: string,
    @Body() dto: MoveQuestReservationDto,
  ) {
    return this.scheduleService.moveQuestReservation(id, dto);
  }

  @Delete('quest-reservations/:id')
  async cancelQuestReservation(@Param('id') id: string) {
    await this.scheduleService.cancelQuestReservation(id);
    return { success: true };
  }

  // ==================== QUICK BOOKING ====================

  @Post('tables/quick-book')
  async quickBookTable(@Body() dto: QuickTableBookingDto) {
    return this.scheduleService.quickBookTable(dto);
  }

  @Post('quests/quick-book')
  async quickBookQuest(@Body() dto: QuickQuestBookingDto) {
    return this.scheduleService.quickBookQuest(dto);
  }
}
