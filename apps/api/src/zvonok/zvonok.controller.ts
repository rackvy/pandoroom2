import { Controller, Get, UseGuards } from '@nestjs/common';
import { EmployeeRole } from '@prisma/client';
import { ZvonokService } from './zvonok.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin/zvonok')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN)
export class ZvonokController {
  constructor(private zvonokService: ZvonokService) {}

  @Get('status')
  status() {
    return this.zvonokService.status();
  }
}
