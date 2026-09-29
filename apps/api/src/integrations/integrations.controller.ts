import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EmployeeRole } from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN)
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get()
  findAll() {
    return this.integrationsService.describe().then((integrations) => ({ integrations }));
  }

  @Patch(':provider')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Param('provider') provider: string, @Body() dto: UpdateIntegrationDto) {
    return this.integrationsService.update(provider, dto.fields || {});
  }
}
