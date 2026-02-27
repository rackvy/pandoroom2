import { IsString, IsOptional, IsInt, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsUUID()
  branchId: string;

  @IsDateString()
  eventDate: string;

  @IsString()
  clientName: string;

  @IsString()
  clientPhone: string;

  @IsString()
  @IsOptional()
  birthdayPersonName?: string;

  @IsInt()
  @IsOptional()
  birthdayPersonAge?: number;

  @IsInt()
  @IsOptional()
  guestsKids?: number;

  @IsInt()
  @IsOptional()
  guestsAdults?: number;

  @IsString()
  @IsOptional()
  commentClient?: string;

  @IsString()
  @IsOptional()
  commentInternal?: string;

  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus = BookingStatus.draft;

  @IsInt()
  @IsOptional()
  depositRub?: number = 0;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
