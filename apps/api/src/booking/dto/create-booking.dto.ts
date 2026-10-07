import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  Matches,
  ArrayMaxSize,
} from 'class-validator';
import { BookingStatus, BookingType, PaymentMethod } from '@prisma/client';

const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

export class CreateBookingDto {
  @IsUUID()
  branchId: string;

  @IsDateString()
  eventDate: string;

  @IsString()
  clientName: string;

  @IsString()
  clientPhone: string;

  /** Клиент из справочника: тогда телефон не обязателен и берётся у карточки. */
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsEnum(BookingType)
  @IsOptional()
  type?: BookingType = BookingType.party;

  /** Начало праздника — нужно, чтобы сразу запросить столы и квесты. */
  @Matches(TIME_PATTERN, { message: 'Некорректное время, нужен формат ЧЧ:ММ' })
  @IsOptional()
  startTime?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  tableIds?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  questIds?: string[];

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

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}
