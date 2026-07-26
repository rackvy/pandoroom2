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

  @IsOptional()
  @IsString({ message: 'SEO-заголовок должен быть строкой' })
  seoTitle?: string;

  @IsOptional()
  @IsString({ message: 'SEO-описание должно быть строкой' })
  seoDescription?: string;

  @IsOptional()
  @IsString({ message: 'SEO-ключевые слова должны быть строкой' })
  seoKeywords?: string;

  @IsOptional()
  @IsString({ message: 'Schema.org JSON должен быть строкой' })
  schemaJson?: string;
}
