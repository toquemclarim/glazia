import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedRequest } from './auth-context';
import { ALLOW_INACTIVE_KEY } from './allow-inactive.decorator';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request);
    const auth = await this.authService.resolveAuthFromToken(token);

    const authenticatedRequest = request as AuthenticatedRequest &
      FastifyRequest;
    authenticatedRequest.auth = auth;

    const allowInactive = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INACTIVE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowInactive) {
      await this.authService.assertEmpresaOperacional(auth);
    }

    return true;
  }

  private extractBearerToken(request: FastifyRequest): string {
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Bearer token não informado');
    }

    return token;
  }
}
