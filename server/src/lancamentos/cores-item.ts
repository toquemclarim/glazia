export const TIPOS_COR = ['PERFIL', 'VIDRO', 'ACESSORIO'] as const
export type TipoCorPrincipal = (typeof TIPOS_COR)[number]
export type PoliticaCorLinha = TipoCorPrincipal | 'PERGUNTAR'

export const COR_SENTINELA = 'GERAL'

export function isTipoCor(value: string | null | undefined): value is TipoCorPrincipal {
  return TIPOS_COR.includes((value ?? '').toUpperCase() as TipoCorPrincipal)
}

export function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function politicaDaLinha(codigo: string | null | undefined, stored?: string | null): PoliticaCorLinha {
  const linha = (codigo ?? '').trim().toUpperCase()
  if (linha === 'TEMPERADO') return 'VIDRO'
  if (linha === 'GOLD' || linha === 'SUPREMA' || linha === '25') return 'PERFIL'
  const raw = (stored ?? '').trim().toUpperCase()
  if (raw === 'PERFIL' || raw === 'VIDRO' || raw === 'PERGUNTAR') return raw
  return 'PERGUNTAR'
}

export function tipoEfetivo(opts: {
  politica: PoliticaCorLinha
  tipoInformado?: string | null
}): TipoCorPrincipal {
  if (opts.politica === 'PERFIL' || opts.politica === 'VIDRO') return opts.politica
  const informado = (opts.tipoInformado ?? '').trim().toUpperCase()
  if (isTipoCor(informado)) return informado
  throw new Error('Escolha se a cor principal é perfil, vidro ou acessórios')
}

export function slotsDoItem(opts: {
  tipo: TipoCorPrincipal
  corPrincipal: string
  corPerfil?: string | null
  corVidro?: string | null
  corAcessorio?: string | null
}) {
  const principal = opts.corPrincipal.trim()
  return {
    tipo_cor_principal: opts.tipo,
    cor_perfil: opts.tipo === 'PERFIL' ? principal : emptyToNull(opts.corPerfil),
    cor_vidro: opts.tipo === 'VIDRO' ? principal : emptyToNull(opts.corVidro),
    cor_acessorio: opts.tipo === 'ACESSORIO' ? principal : emptyToNull(opts.corAcessorio),
  }
}

export function corPrincipalDoSlot(opts: {
  tipo: string | null
  corPerfil?: string | null
  corVidro?: string | null
  corAcessorio?: string | null
  fallback?: string | null
}): string {
  const tipo = (opts.tipo ?? '').toUpperCase()
  const fromSlot =
    tipo === 'VIDRO'
      ? opts.corVidro
      : tipo === 'ACESSORIO'
        ? opts.corAcessorio
        : opts.corPerfil
  const fallback = opts.fallback === COR_SENTINELA ? '' : (opts.fallback ?? '')
  return (fromSlot || fallback || '').trim()
}

export function rotuloTipoCor(tipo: string): string {
  if (tipo === 'VIDRO') return 'Vidro'
  if (tipo === 'ACESSORIO') return 'Acessórios'
  return 'Perfil'
}
