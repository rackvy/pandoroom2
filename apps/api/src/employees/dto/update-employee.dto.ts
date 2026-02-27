import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { EmployeeRole } from '@prisma/client';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString({ message: 'ФИО должно быть строкой' })
  fullName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Дата рождения должна быть в формате ISO' })
  birthDate?: string;

  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Неверный формат email' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Должность должна быть строкой' })
  position?: string;

  @IsOptional()
  @IsString({ message: 'Пароль должен быть строкой' })
  password?: string;

  @IsOptional()
  @IsEnum(EmployeeRole, { message: 'Неверная роль' })
  role?: EmployeeRole;

  @IsOptional()
  @IsBoolean({ message: 'isActive должен быть boolean' })
  isActive?: boolean;
}
