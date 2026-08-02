import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuthContext, AuthenticatedRequest } from './auth-context';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & FastifyRequest>();
    return request.auth;
  },
);
