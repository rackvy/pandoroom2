import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_CLIENT_KEY } from '../decorators/client.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClientGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isClient = this.reflector.getAllAndOverride<boolean>(IS_CLIENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If route is not marked @Client(), skip this guard
    if (!isClient) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не предоставлен');
    }

    const token = authHeader.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      if (payload.userType !== 'client') {
        throw new UnauthorizedException('Неверный тип токена');
      }
      request.user = {
        userId: payload.sub,
        phone: payload.phone,
        userType: 'client',
      };
      return true;
    } catch (e) {
      throw new UnauthorizedException('Недействительный токен');
    }
  }
}
