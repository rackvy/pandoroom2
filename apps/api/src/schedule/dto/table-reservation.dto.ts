import { IsString, IsUUID, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export class CreateTableReservationDto {
  @IsUUID()
  bookingId: string;

  @IsUUID()
  tableId: string;

  @IsUUID()
  branchId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  eventDate: string; // YYYY-MM-DD

  @IsString()
  @Matches(timeRegex)
  startTime: string; // HH:MM

  @IsString()
  @Matches(timeRegex)
  endTime: string; // HH:MM

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class MoveTableReservationDto {
  @IsUUID()
  @IsOptional()
  tableId?: string;

  @IsString()
  @Matches(timeRegex)
  startTime: string; // HH:MM

  @IsString()
  @Matches(timeRegex)
  endTime: string; // HH:MM
}

export class TableReservationResponseDto {
  id: string;
  bookingId: string;
  tableId: string;
  title: string;
  comment: string | null;
  status: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  cleaningBufferMinutes: number;
  blockedUntilTime: string;
}
