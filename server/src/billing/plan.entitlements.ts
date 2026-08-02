export const PLANOS = ['TRIAL', 'BASIC', 'STANDARD', 'PRO'] as const;
export type PlanoAssinatura = (typeof PLANOS)[number];

export type PlanEntitlements = {
  plano: PlanoAssinatura;
  label: string;
  /** null = ilimitado */
  maxUsuarios: number | null;
  chat: boolean;
  export: boolean;
};

const LEGACY: Record<string, PlanoAssinatura> = {
  STARTER: 'BASIC',
  ENTERPRISE: 'PRO',
};

export function normalizarPlano(
  plano: string | null | undefined,
): PlanoAssinatura {
  if (!plano) return 'BASIC';
  const upper = plano.toUpperCase();
  if ((PLANOS as readonly string[]).includes(upper)) {
    return upper as PlanoAssinatura;
  }
  if (LEGACY[upper]) return LEGACY[upper];
  return 'BASIC';
}

export function entitlementsFor(
  plano: string | null | undefined,
): PlanEntitlements {
  const p = normalizarPlano(plano);
  switch (p) {
    case 'TRIAL':
      return {
        plano: p,
        label: 'Trial',
        maxUsuarios: null,
        chat: true,
        export: true,
      };
    case 'STANDARD':
      return {
        plano: p,
        label: 'Standard',
        maxUsuarios: 2,
        chat: true,
        export: true,
      };
    case 'PRO':
      return {
        plano: p,
        label: 'Pro',
        maxUsuarios: null,
        chat: true,
        export: true,
      };
    case 'BASIC':
    default:
      return {
        plano: 'BASIC',
        label: 'Basic',
        maxUsuarios: 1,
        chat: false,
        export: false,
      };
  }
}

export function podeAdicionarUsuario(
  plano: string | null | undefined,
  usuariosAtivos: number,
): boolean {
  const { maxUsuarios } = entitlementsFor(plano);
  if (maxUsuarios == null) return true;
  return usuariosAtivos < maxUsuarios;
}
