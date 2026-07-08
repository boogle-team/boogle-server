import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export const CurrentUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const userId = Number(request.headers['x-user-id']);

    if (!userId || !Number.isInteger(userId)) {
      throw new UnauthorizedException();
    }

    return userId;
  },
);
