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
import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { EmployeeRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { QuestScheduleService, ScheduleSlotResponse } from './quest-schedule.service';

class CreateSlotDto {
  @IsString()
  questId: string;

  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateSlotDto {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateSpecialPriceDto {
  @IsString()
  slotId: string;

  @IsString()
  specialDate: string;

  @IsNumber()
  specialPrice: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

class UpdateSpecialPriceDto {
  @IsOptional()
  @IsNumber()
  specialPrice?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

@Controller('api/admin/quest-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class QuestScheduleController {
  constructor(private scheduleService: QuestScheduleService) {}

  // ==================== SLOTS ====================

  @Get('slots')
  async findAllSlots(@Query('questId') questId: string): Promise<ScheduleSlotResponse[]> {
    return this.scheduleService.findAllSlots(questId);
  }

  @Get('slots/:id')
  async findSlotById(@Param('id') id: string): Promise<ScheduleSlotResponse> {
    return this.scheduleService.findSlotById(id);
  }

  @Post('slots')
  @Roles(EmployeeRole.ADMIN)
  async createSlot(@Body() data: CreateSlotDto): Promise<ScheduleSlotResponse> {
    return this.scheduleService.createSlot(data);
  }

  @Patch('slots/:id')
  @Roles(EmployeeRole.ADMIN)
  async updateSlot(@Param('id') id: string, @Body() data: UpdateSlotDto): Promise<ScheduleSlotResponse> {
    return this.scheduleService.updateSlot(id, data);
  }

  @Delete('slots/:id')
  @Roles(EmployeeRole.ADMIN)
  removeSlot(@Param('id') id: string) {
    return this.scheduleService.removeSlot(id);
  }

  // ==================== SPECIAL PRICES ====================

  @Get('special-prices')
  findSpecialPrices(@Query('slotId') slotId: string) {
    return this.scheduleService.findSpecialPrices(slotId);
  }

  @Post('special-prices')
  @Roles(EmployeeRole.ADMIN)
  createSpecialPrice(@Body() data: CreateSpecialPriceDto) {
    return this.scheduleService.createSpecialPrice({
      ...data,
      specialDate: new Date(data.specialDate),
    });
  }

  @Patch('special-prices/:id')
  @Roles(EmployeeRole.ADMIN)
  updateSpecialPrice(@Param('id') id: string, @Body() data: UpdateSpecialPriceDto) {
    return this.scheduleService.updateSpecialPrice(id, data);
  }

  @Delete('special-prices/:id')
  @Roles(EmployeeRole.ADMIN)
  removeSpecialPrice(@Param('id') id: string) {
    return this.scheduleService.removeSpecialPrice(id);
  }

  // ==================== PUBLIC SCHEDULE VIEW ====================

  @Get('public/quest/:questId')
  getQuestSchedule(
    @Param('questId') questId: string,
    @Query('date') dateStr?: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    if (dateStr) {
      return this.scheduleService.getQuestScheduleForDate(questId, new Date(dateStr));
    }
    
    if (startDateStr && endDateStr) {
      return this.scheduleService.getQuestScheduleForRange(
        questId,
        new Date(startDateStr),
        new Date(endDateStr),
      );
    }

    // Default: return schedule for today
    return this.scheduleService.getQuestScheduleForDate(questId, new Date());
  }

  // ==================== SCHEDULE GRID ====================

  @Get('grid')
  getQuestGrid(
    @Query('date') dateStr: string,
    @Query('branchId') branchId?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.scheduleService.getQuestSlotsForDate(date, branchId);
  }
}
