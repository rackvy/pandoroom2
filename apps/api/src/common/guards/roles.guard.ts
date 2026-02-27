import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeeRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<EmployeeRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const currentUser = user as CurrentUserPayload;

    if (!currentUser) {
      throw new ForbiddenException('Доступ запрещен');
    }

    const userRole = currentUser.role as EmployeeRole;
    
    // ADMIN видит всё
    if (userRole === EmployeeRole.ADMIN) {
      return true;
    }

    // Проверяем, есть ли у пользователя нужная роль
    const hasRole = requiredRoles.includes(userRole);
    
    if (!hasRole) {
      throw new ForbiddenException('Недостаточно прав для выполнения операции');
    }

    return true;
  }
}
