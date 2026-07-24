import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateBlogDto {
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
  @IsString({ message: 'Краткое описание должно быть строкой' })
  excerpt?: string;

  @IsOptional()
  @IsString({ message: 'CSS-градиент фона должен быть строкой' })
  cardBg?: string;
}
