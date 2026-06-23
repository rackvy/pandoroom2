import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsIn(['MISSED_CALL', 'PREORDER_REMINDER', 'ORDER_READY', 'ORDER_IN_PROGRESS'])
  templateKey: string;

  @IsString()
  @IsIn(['telegram', 'sms', 'max'])
  channel: string;
}
