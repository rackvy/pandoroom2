import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientAuthService } from './client-auth.service';
import { ClientAuthController } from './client-auth.controller';
import { OtpService } from './otp.service';
import { ZvonokModule } from '../zvonok/zvonok.module';
import { ClientGuard } from '../common/guards/client.guard';

@Module({
  imports: [
    ZvonokModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'pandoroom-secret-key',
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ClientAuthController],
  providers: [ClientAuthService, OtpService, ClientGuard],
  exports: [ClientAuthService, ClientGuard, JwtModule],
})
export class ClientAuthModule {}
