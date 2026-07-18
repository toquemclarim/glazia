import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { SupabaseService } from '../supabase/supabase.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const makeContext = (request: Record<string, unknown>) =>
    ({
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('rejects requests without bearer token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const supabaseService = {} as SupabaseService;
    const guard = new AuthGuard(reflector, supabaseService);

    await expect(
      guard.canActivate(makeContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('resolves empresaId from the authenticated profile', async () => {
    const perfilQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id_empresa: 'empresa-a',
          nome_completo: 'Ana',
          cargo: 'ADMIN',
        },
        error: null,
      }),
    };
    const userClient = {
      from: jest.fn().mockReturnValue(perfilQuery),
    };
    const supabaseService = {
      getUser: jest.fn().mockResolvedValue({
        id: 'user-a',
        email: 'ana@glazia.com.br',
      }),
      forAccessToken: jest.fn().mockReturnValue(userClient),
    } as unknown as SupabaseService;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer valid-token' },
    };
    const guard = new AuthGuard(reflector, supabaseService);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(perfilQuery.eq).toHaveBeenCalledWith('id', 'user-a');
    expect(request.auth).toEqual(
      expect.objectContaining({
        userId: 'user-a',
        empresaId: 'empresa-a',
      }),
    );
  });
});
