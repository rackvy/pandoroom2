import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, Length } from 'class-validator';

/**
 * Пачка id для списков. Верхняя граница — размер страницы таблицы с запасом:
 * без неё один запрос мог бы вытащить сколько угодно клиентов.
 */
export class BulkChannelsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Length(1, 64, { each: true })
  clientIds: string[];
}
