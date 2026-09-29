import { IsObject, IsOptional } from 'class-validator';

export class UpdateIntegrationDto {
  @IsOptional()
  @IsObject()
  fields: Record<string, unknown> = {};
}
