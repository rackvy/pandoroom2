import { IsString, IsOptional } from 'class-validator';

export class MoveVRReservationDto {
  @IsOptional()
  @IsString()
  hallId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}
