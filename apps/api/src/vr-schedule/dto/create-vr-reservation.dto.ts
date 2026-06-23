import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsDateString } from 'class-validator';

export class CreateVRReservationDto {
  @IsString()
  @IsNotEmpty()
  hallId: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsIn(['full_hall', 'open_slot'])
  type: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  gameId?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsNumber()
  guestsCount?: number;

  @IsOptional()
  @IsNumber()
  maxGuests?: number;

  @IsOptional()
  @IsString()
  bookingId?: string;
}
