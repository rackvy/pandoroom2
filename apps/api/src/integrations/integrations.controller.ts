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
import { ChannelRegistry } from './channels/channel-registry';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN)
export class IntegrationsController {
  constructor(
    private integrationsService: IntegrationsService,
    private channelRegistry: ChannelRegistry,
  ) {}

  @Get()
  findAll() {
    return this.integrationsService.describe().then((integrations) => ({ integrations }));
  }

  /** Боевой драйвер или заглушка — правило выбора на сервере, фронт его не повторяет. */
  @Get('wazzup/driver')
  wazzupDriver() {
    return this.channelRegistry.mode();
  }

  @Patch(':provider')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Param('provider') provider: string, @Body() dto: UpdateIntegrationDto) {
    return this.integrationsService.update(provider, dto.fields || {});
  }
}
