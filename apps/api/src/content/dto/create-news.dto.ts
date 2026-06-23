import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateNewsDto {
  @IsString({ message: 'Заголовок должен быть строкой' })
  title: string;

  @IsDateString({}, { message: 'Дата должна быть в формате ISO' })
  date: string;

  @IsOptional()
  @IsString({ message: 'ID изображения должен быть строкой' })
  imageId?: string;

  @IsString({ message: 'Содержание должно быть строкой' })
  content: string;

  @IsOptional()
  @IsString({ message: 'Заголовок карточки должен быть строкой' })
  coverTitle?: string;

  @IsOptional()
  @IsString({ message: 'Подзаголовок карточки должен быть строкой' })
  coverSub?: string;

  @IsOptional()
  @IsString({ message: 'Вариант карточки должен быть строкой' })
  coverVariant?: string;

  @IsOptional()
  @IsString({ message: 'CSS-градиент фона должен быть строкой' })
  cardBg?: string;
}
