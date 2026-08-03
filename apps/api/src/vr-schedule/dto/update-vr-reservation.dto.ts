import { IsString, IsOptional, IsNumber, IsIn, IsDateString } from 'class-validator';

export class UpdateVRReservationDto {
  @IsOptional()
  @IsString()
  hallId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  @IsIn(['full_hall', 'open_slot', 'blocked'])
  type?: string;

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
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsNumber()
  guestsCount?: number;

  @IsOptional()
  @IsNumber()
  maxGuests?: number;
}
