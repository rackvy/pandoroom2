import { IsString, IsUUID, IsOptional, Matches } from 'class-validator';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export class CreateQuestReservationDto {
  @IsUUID()
  bookingId: string;

  @IsUUID()
  questId: string;

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
  title: string;

  @IsString()
  @IsOptional()
  animatorName?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class MoveQuestReservationDto {
  @IsUUID()
  @IsOptional()
  questId?: string;

  @IsString()
  @Matches(timeRegex)
  startTime: string; // HH:MM

  @IsString()
  @Matches(timeRegex)
  endTime: string; // HH:MM
}

export class QuestReservationResponseDto {
  id: string;
  bookingId: string;
  questId: string;
  title: string;
  animatorName: string | null;
  comment: string | null;
  status: string;
  startTime: string;
  endTime: string;
}
