import { Controller, Post, Get, Patch, Body, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientLoginDto } from './dto/client-login.dto';
import { Public } from '../common/decorators/public.decorator';
import { Client } from '../common/decorators/client.decorator';
import { CurrentClient, ClientUserPayload } from '../common/decorators/current-client.decorator';
import { ClientGuard } from '../common/guards/client.guard';

@Controller('api/lk')
@UseGuards(ClientGuard)
export class ClientAuthController {
  constructor(private clientAuthService: ClientAuthService) {}

  @Post('auth/login')
  @Public()
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() dto: ClientLoginDto) {
    return this.clientAuthService.login(dto);
  }

  @Get('profile')
  @Public()
  @Client()
  async getProfile(@CurrentClient() user: ClientUserPayload) {
    return this.clientAuthService.getProfile(user.userId);
  }

  @Patch('profile')
  @Public()
  @Client()
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateProfile(
    @CurrentClient() user: ClientUserPayload,
    @Body() data: { name?: string; email?: string; birthday?: string },
  ) {
    return this.clientAuthService.updateProfile(user.userId, data);
  }
}
