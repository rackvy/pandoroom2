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
}
