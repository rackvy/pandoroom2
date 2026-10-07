import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Запрос свободных столов/квестов на интервал: дата + начало и конец окна. */
export class AvailabilityQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date должен быть в формате ГГГГ-ММ-ДД' })
  date: string;

  @IsString()
  @Matches(HHMM, { message: 'startTime должен быть в формате ЧЧ:ММ' })
  startTime: string;

  @IsString()
  @Matches(HHMM, { message: 'endTime должен быть в формате ЧЧ:ММ' })
  endTime: string;
}
