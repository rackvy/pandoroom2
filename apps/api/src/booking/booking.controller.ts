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
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('api/admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get()
  findAll(@Query('branchId') branchId?: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.bookingService.findAll({ branchId, dateFrom, dateTo });
  }

  @Get('by-date')
  findByDate(@Query('date') date: string) {
    return this.bookingService.findByDate(new Date(date));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOneWithReservations(id);
  }

  @Get(':id/full')
  findOneFull(@Param('id') id: string) {
    return this.bookingService.findOneFull(id);
  }

  @Patch(':id/basic')
  updateBasic(@Param('id') id: string, @Body() data: any) {
    return this.bookingService.updateBasic(id, data);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() data: CreateBookingDto) {
    return this.bookingService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.bookingService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }

  // ==================== TABLE SLOTS ====================
  @Post(':id/table-slots')
  addTableSlot(@Param('id') bookingId: string, @Body() data: any) {
    return this.bookingService.addTableSlot(bookingId, data);
  }

  @Delete('table-slots/:slotId')
  removeTableSlot(@Param('slotId') id: string) {
    return this.bookingService.removeTableSlot(id);
  }

  // ==================== QUEST SLOTS ====================
  @Post(':id/quest-slots')
  addQuestSlot(@Param('id') bookingId: string, @Body() data: any) {
    return this.bookingService.addQuestSlot(bookingId, data);
  }

  @Delete('quest-slots/:slotId')
  removeQuestSlot(@Param('slotId') id: string) {
    return this.bookingService.removeQuestSlot(id);
  }

  // ==================== EXTRA SLOTS ====================
  @Post(':id/extra-slots')
  addExtraSlot(@Param('id') bookingId: string, @Body() data: any) {
    return this.bookingService.addExtraSlot(bookingId, data);
  }

  @Delete('extra-slots/:slotId')
  removeExtraSlot(@Param('slotId') id: string) {
    return this.bookingService.removeExtraSlot(id);
  }

  // ==================== CAKES ====================
  @Post(':id/cakes')
  addCake(@Param('id') bookingId: string, @Body() data: any) {
    return this.bookingService.addCake(bookingId, data);
  }

  @Delete('cakes/:itemId')
  removeCake(@Param('itemId') id: string) {
    return this.bookingService.removeCake(id);
  }

  // ==================== DECORATIONS ====================
  @Post(':id/decorations')
  addDecorationItem(@Param('id') bookingId: string, @Body() data: any) {
    return this.bookingService.addDecorationItem(bookingId, data);
  }

  @Delete('decorations/:itemId')
  removeDecorationItem(@Param('itemId') id: string) {
    return this.bookingService.removeDecorationItem(id);
  }

  // ==================== FOOD ====================
  @Post(':id/food')
  addFoodItem(@Param('id') bookingId: string, @Body() data: any) {
    return this.bookingService.addFoodItem(bookingId, data);
  }

  @Delete('food/:itemId')
  removeFoodItem(@Param('itemId') id: string) {
    return this.bookingService.removeFoodItem(id);
  }
}
