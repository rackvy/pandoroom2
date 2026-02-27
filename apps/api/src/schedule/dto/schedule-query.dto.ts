import { IsString, IsUUID, Matches } from 'class-validator';

export class ScheduleQueryDto {
  @IsUUID()
  branchId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string; // YYYY-MM-DD
}
