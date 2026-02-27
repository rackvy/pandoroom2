import { IsString, IsOptional, IsEnum, IsInt, IsJSON } from 'class-validator';
import { PageKey } from '@prisma/client';

export class CreatePageBlockDto {
  @IsEnum(PageKey, { message: 'Неверный ключ страницы' })
  pageKey: PageKey;

  @IsString({ message: 'Ключ блока должен быть строкой' })
  blockKey: string;

  @IsOptional()
  @IsString({ message: 'Заголовок должен быть строкой' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Текст должен быть строкой' })
  text?: string;

  @IsOptional()
  @IsString({ message: 'URL ссылки должен быть строкой' })
  linkUrl?: string;

  @IsOptional()
  @IsString({ message: 'ID файла должен быть строкой' })
  fileId?: string;

  @IsOptional()
  @IsString({ message: 'ID изображения должен быть строкой' })
  imageId?: string;

  @IsOptional()
  extraJson?: any;

  @IsOptional()
  @IsInt({ message: 'Порядок сортировки должен быть числом' })
  sortOrder?: number;
}
