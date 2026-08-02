export type Cargo = 'ADM' | 'DIRETOR' | 'SOCIO' | 'VENDAS' | 'PLATFORM';

/** Cargos que o Diretor pode criar na Equipe (nunca DIRETOR). */
export type CargoConvidavel = 'ADM' | 'SOCIO' | 'VENDAS';

export interface AuthContext {
  userId: string;
  email: string;
  empresaId: string;
  nomeCompleto: string;
  cargo: Cargo;
  dataNascimento: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  empresaId: string;
  nome: string;
  cargo: Cargo;
  dataNascimento?: string | null;
  /** Emitido pelo jsonwebtoken (segundos Unix). */
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest {
  auth: AuthContext;
  headers: Record<string, string | string[] | undefined>;
}
