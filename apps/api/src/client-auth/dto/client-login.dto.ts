import { IsString, IsNotEmpty } from 'class-validator';

export class ClientLoginDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
