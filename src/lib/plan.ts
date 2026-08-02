import type { PlanoAssinatura } from '../types'

export type PlanEntitlements = {
  plano: PlanoAssinatura
  label: string
  /** null = ilimitado */
  maxUsuarios: number | null
  /** Chat com atalhos (Standard, Pro e Trial). */
  chat: boolean
  /** Digitação livre no chat (Pro e Trial). */
  chatLivre: boolean
  export: boolean
}

export type UpsellFeature = 'chat' | 'chatLivre' | 'export' | 'usuarios'

const PLAN_ORDER: PlanoAssinatura[] = ['TRIAL', 'BASIC', 'STANDARD', 'PRO']

const LEGACY: Record<string, PlanoAssinatura> = {
  STARTER: 'BASIC',
  ENTERPRISE: 'PRO',
}

export function normalizarPlano(
  plano: string | null | undefined,
): PlanoAssinatura {
  if (!plano) return 'BASIC'
  const upper = plano.toUpperCase()
  if ((PLAN_ORDER as string[]).includes(upper)) {
    return upper as PlanoAssinatura
  }
  if (LEGACY[upper]) return LEGACY[upper]
  return 'BASIC'
}

export function entitlementsFor(
  plano: string | null | undefined,
): PlanEntitlements {
  const p = normalizarPlano(plano)
  switch (p) {
    case 'TRIAL':
      return {
        plano: p,
        label: 'Trial',
        maxUsuarios: null,
        chat: true,
        chatLivre: true,
        export: true,
      }
    case 'STANDARD':
      return {
        plano: p,
        label: 'Standard',
        maxUsuarios: 2,
        chat: true,
        chatLivre: false,
        export: true,
      }
    case 'PRO':
      return {
        plano: p,
        label: 'Pro',
        maxUsuarios: null,
        chat: true,
        chatLivre: true,
        export: true,
      }
    case 'BASIC':
    default:
      return {
        plano: 'BASIC',
        label: 'Basic',
        maxUsuarios: 1,
        chat: false,
        chatLivre: false,
        export: false,
      }
  }
}

export function planoLabel(plano: string | null | undefined): string {
  return entitlementsFor(plano).label
}

export function planoAlvoUpsell(feature: UpsellFeature): PlanoAssinatura {
  if (feature === 'chat') return 'STANDARD'
  return 'PRO'
}

export const WHATSAPP_UPGRADE_URL =
  'https://wa.me/5571986868421?text=' +
  encodeURIComponent('Olá! Gostaria de mudar meu plano Glazia')

export function whatsappAtivarEmpresaUrl(opts: {
  empresaNome?: string | null
  responsavel?: string | null
}) {
  const msg = [
    'Olá!',
    'Meu período de teste do Glazia terminou e gostaria de ativar minha empresa.',
    '',
    `Nome da empresa: ${opts.empresaNome?.trim() || '—'}`,
    `Nome do responsável: ${opts.responsavel?.trim() || '—'}`,
  ].join('\n')
  return `https://wa.me/5571986868421?text=${encodeURIComponent(msg)}`
}

export const PLAN_COPY: Record<
  Exclude<PlanoAssinatura, 'TRIAL'>,
  { titulo: string; tagline: string; beneficios: string[] }
> = {
  BASIC: {
    titulo: 'Basic',
    tagline: 'Um usuário, o essencial da operação.',
    beneficios: [
      '1 usuário (Diretor)',
      'Lançamentos e clientes',
      'Painel financeiro da empresa',
    ],
  },
  STANDARD: {
    titulo: 'Standard',
    tagline: 'Equipe enxuta + consultas e exportação.',
    beneficios: [
      'Até 2 usuários',
      'Chat com atalhos (resumo, produto, custos, meta)',
      'Exportação PDF e Excel',
    ],
  },
  PRO: {
    titulo: 'Pro',
    tagline: 'Time completo, sem teto de acessos.',
    beneficios: [
      'Usuários ilimitados',
      'Chat livre + atalhos (perguntas digitadas)',
      'Exportação PDF e Excel',
    ],
  },
}
