import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuthenticatedRequest } from './auth-context';
import { IS_PUBLIC_KEY } from './public.decorator';

interface PerfilRow {
  id_empresa: string;
  nome_completo: string | null;
  cargo: string | null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
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
    const accessToken = this.extractBearerToken(request);
    const user = await this.supabaseService.getUser(accessToken);

    if (!user) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    const userClient = this.supabaseService.forAccessToken(accessToken);
    const { data, error } = await userClient
      .from('perfis')
      .select('id_empresa,nome_completo,cargo')
      .eq('id', user.id)
      .maybeSingle<PerfilRow>();

    if (error || !data?.id_empresa) {
      throw new UnauthorizedException(
        'Usuário autenticado sem empresa vinculada',
      );
    }

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.auth = {
      userId: user.id,
      email: user.email ?? null,
      empresaId: data.id_empresa,
      nomeCompleto: data.nome_completo,
      cargo: data.cargo,
      accessToken,
    };
    authenticatedRequest.supabase = userClient;

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
