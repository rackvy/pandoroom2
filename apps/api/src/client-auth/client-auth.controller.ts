import { Controller, Post, Get, Patch, Body, Req, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ClientAuthService } from './client-auth.service';
import { OtpService } from './otp.service';
import { ClientLoginDto } from './dto/client-login.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { Public } from '../common/decorators/public.decorator';
import { Client } from '../common/decorators/client.decorator';
import { CurrentClient, ClientUserPayload } from '../common/decorators/current-client.decorator';
import { ClientGuard } from '../common/guards/client.guard';

@Controller('api/lk')
@UseGuards(ClientGuard)
export class ClientAuthController {
  constructor(
    private clientAuthService: ClientAuthService,
    private otpService: OtpService,
  ) {}

  @Get('auth/channels')
  @Public()
  channels() {
    return this.otpService.channels();
  }

  @Post('auth/send-code')
  @Public()
  @UsePipes(new ValidationPipe({ transform: true }))
  sendCode(@Body() dto: SendCodeDto, @Req() request: Request) {
    return this.otpService.send(dto.phone, dto.channel || 'call', request.ip || null);
  }

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
