import { IsString, IsOptional, IsInt, Min, Max, Matches, IsUUID } from 'class-validator';

const TIME_REGEX = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class QuickTableBookingDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  tableId: string;

  @Matches(DATE_REGEX, { message: 'Date must be in YYYY-MM-DD format' })
  eventDate: string;

  @Matches(TIME_REGEX, { message: 'Time must be in HH:MM format' })
  startTime: string;

  @IsOptional()
  @IsInt({ message: 'Duration must be an integer' })
  @Min(60, { message: 'Duration must be at least 60 minutes' })
  @Max(360, { message: 'Duration must be at most 360 minutes' })
  durationMinutes?: number = 120;

  @IsOptional()
  @IsString()
  clientName?: string = '';

  @IsOptional()
  @IsString()
  clientPhone?: string = '';
}

export class QuickQuestBookingDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  questId: string;

  @Matches(DATE_REGEX, { message: 'Date must be in YYYY-MM-DD format' })
  eventDate: string;

  @Matches(TIME_REGEX, { message: 'Time must be in HH:MM format' })
  startTime: string;

  @IsOptional()
  @IsInt({ message: 'Duration must be an integer' })
  @Min(30, { message: 'Duration must be at least 30 minutes' })
  @Max(360, { message: 'Duration must be at most 360 minutes' })
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  clientName?: string = '';

  @IsOptional()
  @IsString()
  clientPhone?: string = '';
}

export interface QuickBookingResponse {
  booking: {
    id: string;
    status: string;
    eventDate: string;
    clientName: string;
    clientPhone: string;
    depositRub: number;
  };
  reservation: {
    id: string;
    tableId?: string;
    questId?: string;
    startTime: string;
    endTime: string;
    cleaningBufferMinutes?: number;
    blockedUntilTime?: string;
  };
}
