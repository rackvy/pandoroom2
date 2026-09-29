import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { OtpChannel } from '../otp.service';

export class SendCodeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsIn(['call', 'sms'])
  channel?: OtpChannel;
}
