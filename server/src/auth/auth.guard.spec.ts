import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const authService = {
    resolveAuthFromToken: jest.fn(),
  } as unknown as AuthService;

  const guard = new AuthGuard(reflector, authService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('permite rotas públicas', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    await expect(
      guard.canActivate({
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as never),
    ).resolves.toBe(true);
  });

  it('rejeita ausência de Bearer token', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    await expect(
      guard.canActivate({
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
      } as never),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('injeta auth revalidado a partir do banco', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (authService.resolveAuthFromToken as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      email: 'diretor@glazia.com.br',
      empresaId: 'empresa-demo-001',
      nomeCompleto: 'Diretor Atualizado',
      cargo: 'DIRETOR',
      dataNascimento: '1985-03-12',
    });

    const request: {
      headers: { authorization: string };
      auth?: unknown;
    } = {
      headers: { authorization: 'Bearer token-valido' },
    };

    await expect(
      guard.canActivate({
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as never),
    ).resolves.toBe(true);

    expect(authService.resolveAuthFromToken).toHaveBeenCalledWith(
      'token-valido',
    );
    expect(request.auth).toEqual({
      userId: 'user-1',
      email: 'diretor@glazia.com.br',
      empresaId: 'empresa-demo-001',
      nomeCompleto: 'Diretor Atualizado',
      cargo: 'DIRETOR',
      dataNascimento: '1985-03-12',
    });
  });

  it('rejeita sessão quando o usuário não está ativo no banco', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (authService.resolveAuthFromToken as jest.Mock).mockRejectedValue(
      new UnauthorizedException('Sessão inválida ou usuário inativo'),
    );

    await expect(
      guard.canActivate({
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer token-antigo' },
          }),
        }),
      } as never),
    ).rejects.toThrow(UnauthorizedException);
  });
});
