import { ForbiddenException } from '@nestjs/common';
import type { AuthContext } from './auth-context';
import {
  assertAnalista,
  assertDiretoria,
  assertGestaoEquipe,
  assertOperador,
  assertPlatform,
} from './roles';

function auth(cargo: AuthContext['cargo']): AuthContext {
  return {
    userId: 'u1',
    email: 'u@test.com',
    empresaId: 'empresa-a',
    nomeCompleto: 'Teste',
    cargo,
    dataNascimento: null,
  };
}

describe('RBAC roles', () => {
  it('assertOperador permite ADM, DIRETOR e VENDAS', () => {
    expect(() => assertOperador(auth('ADM'))).not.toThrow();
    expect(() => assertOperador(auth('DIRETOR'))).not.toThrow();
    expect(() => assertOperador(auth('VENDAS'))).not.toThrow();
  });

  it('assertOperador bloqueia SOCIO (não lê clientes/catálogo)', () => {
    expect(() => assertOperador(auth('SOCIO'))).toThrow(ForbiddenException);
  });

  it('assertAnalista permite DIRETOR e SOCIO', () => {
    expect(() => assertAnalista(auth('DIRETOR'))).not.toThrow();
    expect(() => assertAnalista(auth('SOCIO'))).not.toThrow();
    expect(() => assertAnalista(auth('ADM'))).toThrow(ForbiddenException);
    expect(() => assertAnalista(auth('VENDAS'))).toThrow(ForbiddenException);
  });

  it('assertDiretoria e assertGestaoEquipe só DIRETOR', () => {
    expect(() => assertDiretoria(auth('DIRETOR'))).not.toThrow();
    expect(() => assertGestaoEquipe(auth('DIRETOR'))).not.toThrow();
    expect(() => assertDiretoria(auth('ADM'))).toThrow(ForbiddenException);
    expect(() => assertGestaoEquipe(auth('SOCIO'))).toThrow(ForbiddenException);
  });

  it('assertPlatform só PLATFORM', () => {
    expect(() => assertPlatform(auth('PLATFORM'))).not.toThrow();
    expect(() => assertPlatform(auth('DIRETOR'))).toThrow(ForbiddenException);
  });
});
