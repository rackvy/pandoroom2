import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class ClientLoginDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'Код должен состоять из цифр' })
  code: string;
}
