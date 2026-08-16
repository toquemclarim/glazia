import { ForbiddenException } from '@nestjs/common';
import type { AuthContext, Cargo } from '../auth/auth-context';

/** Lançamentos, clientes — operação do dia a dia. */
export function assertOperador(auth: AuthContext) {
  if (
    auth.cargo !== 'ADM' &&
    auth.cargo !== 'DIRETOR' &&
    auth.cargo !== 'VENDAS'
  ) {
    throw new ForbiddenException(
      'Apenas ADM, Vendas ou Diretor podem executar esta ação',
    );
  }
}

/** Consulta de vendas (lista, detalhe, calendário) — operação e sócios. */
export function assertConsultaVendas(auth: AuthContext) {
  if (
    auth.cargo !== 'ADM' &&
    auth.cargo !== 'DIRETOR' &&
    auth.cargo !== 'VENDAS' &&
    auth.cargo !== 'SOCIO'
  ) {
    throw new ForbiddenException(
      'Apenas ADM, Vendas, Diretor ou Sócio podem consultar vendas',
    );
  }
}

/** Análise financeira e painel de sócios. */
export function assertAnalista(auth: AuthContext) {
  if (auth.cargo !== 'DIRETOR' && auth.cargo !== 'SOCIO') {
    throw new ForbiddenException(
      'Apenas Diretor ou Sócio podem acessar a análise financeira',
    );
  }
}

/** Despesas fixas, vencimentos e sinalização de pagamento/recebimento. */
export function assertDiretoria(auth: AuthContext) {
  if (auth.cargo !== 'DIRETOR') {
    throw new ForbiddenException(
      'Apenas o Diretor pode gerenciar custos fixos e caixa',
    );
  }
}

/** Gestão de usuários da própria empresa (equipe). */
export function assertGestaoEquipe(auth: AuthContext) {
  if (auth.cargo !== 'DIRETOR') {
    throw new ForbiddenException(
      'Apenas o Diretor pode gerenciar a equipe da empresa',
    );
  }
}

/** Console Ops — dono do SaaS Glazia. */
export function assertPlatform(auth: AuthContext) {
  if (auth.cargo !== 'PLATFORM') {
    throw new ForbiddenException(
      'Acesso restrito ao painel da plataforma Glazia',
    );
  }
}

export function isCargo(
  cargo: Cargo,
  ...allowed: Cargo[]
): boolean {
  return allowed.includes(cargo);
}
