import { IsString, IsInt, IsUUID, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsString({ message: 'Имя должно быть строкой' })
  name: string;

  @IsInt({ message: 'Рейтинг должен быть числом' })
  @Min(1, { message: 'Рейтинг минимум 1' })
  @Max(5, { message: 'Рейтинг максимум 5' })
  rating: number;

  @IsUUID('4', { message: 'ID источника должен быть UUID' })
  sourceId: string;

  @IsString({ message: 'Текст должен быть строкой' })
  text: string;
}
