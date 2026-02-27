import { IsString, IsOptional, IsEmail, IsDateString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  phone: string;

  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  birthday?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
