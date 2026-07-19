import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ClientUserPayload {
  userId: string;
  phone: string;
  userType: 'client';
}

export const CurrentClient = createParamDecorator(
  (data: keyof ClientUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ClientUserPayload;
    return data ? user?.[data] : user;
  },
);
