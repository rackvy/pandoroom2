import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChannelKind } from '@prisma/client';

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;

  /** Контекст-тег «по поводу какой брони», лента у клиента при этом одна. */
  @IsOptional()
  @IsString()
  bookingId?: string;

  /** Без него — внутренний чат. Наружный канал идёт через драйвер. */
  @IsOptional()
  @IsEnum(ChannelKind)
  channel?: ChannelKind;
}
