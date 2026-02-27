import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { EmployeeRole } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString({ message: 'ФИО должно быть строкой' })
  fullName: string;

  @IsOptional()
  @IsDateString({}, { message: 'Дата рождения должна быть в формате ISO' })
  birthDate?: string;

  @IsString({ message: 'Телефон должен быть строкой' })
  phone: string;

  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;

  @IsString({ message: 'Должность должна быть строкой' })
  position: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  password: string;

  @IsEnum(EmployeeRole, { message: 'Неверная роль' })
  role: EmployeeRole;

  @IsOptional()
  @IsBoolean({ message: 'isActive должен быть boolean' })
  isActive?: boolean;
}
