import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { EmployeeRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { IikoService } from './iiko.service';

@Controller('api')
export class IikoController {
  constructor(private readonly iikoService: IikoService) {}

  @Get('admin/iiko/menu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
  getMenu() {
    return this.iikoService.getMenu();
  }

  @Post('admin/iiko/menu/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.ADMIN)
  syncMenu() {
    return this.iikoService.syncMenu();
  }

  @Post('admin/iiko/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
  createOrder(@Body() body: { bookingId: string; items: any[] }) {
    return this.iikoService.createOrder(body.bookingId, body.items);
  }

  @Get('admin/iiko/orders/:iikoOrderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
  getOrderStatus(@Param('iikoOrderId') iikoOrderId: string) {
    return this.iikoService.getOrderStatus(iikoOrderId);
  }

  @Post('webhooks/iiko')
  @Public()
  handleWebhook(@Body() body: any) {
    return this.iikoService.handleWebhook(body);
  }
}
