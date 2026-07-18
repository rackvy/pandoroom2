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
import { EmployeeRole } from '@prisma/client';
import { WaitlistService } from './waitlist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin/waitlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Get()
  getWaitlist(
    @Query('questId') questId?: string,
    @Query('status') status?: string,
  ) {
    return this.waitlistService.getWaitlist(questId, status);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.waitlistService.updateStatus(id, status);
  }

  @Post(':id/notify')
  notifyManually(@Param('id') id: string) {
    // TODO: trigger manual notification for specific entry
    return { success: true };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waitlistService.removeFromWaitlist(id);
  }
}
