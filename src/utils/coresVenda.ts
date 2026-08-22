export const TIPOS_COR = ['PERFIL', 'VIDRO', 'ACESSORIO'] as const
export type TipoCorPrincipal = (typeof TIPOS_COR)[number]
export type PoliticaCorLinha = TipoCorPrincipal | 'PERGUNTAR'

export const COR_SENTINELA = 'GERAL'

/** Espelha `dt_catalogo.dim_cor` (sem GERAL). Usado se `/catalogo/cores` falhar. */
const CORES_AMBOS = [
  'AÇO CORTEN',
  'AZUL MARINHO',
  'BRANCO',
  'BRONZE',
  'CHAMPAGNE',
  'ESCOVADO',
  'GRAFITE',
  'NATURAL/ALUMÍNIO',
  'POLIDO',
  'PRATA',
  'PRETO',
] as const

const CORES_PERFIL = [
  'ANODIZADO NATURAL',
  'ANODIZADO PRETO',
  'BEGE',
  'BRANCO FOSCO',
  'CINZA',
  'GOLD ROSE',
  'MARROM',
  'PRETO FOSCO',
  'VERDE MUSGO',
] as const

const CORES_VIDRO = [
  'ESPELHO BRONZE',
  'ESPELHO PRATA',
  'EXTRA CLEAR',
  'FOSCO ÁCIDO',
  'FUMÊ',
  'INCOLOR',
  'JATEADO',
  'PINTADO PRETO',
  'REFLETIVO AZUL',
  'REFLETIVO PRATA',
  'SERIGRAFADO BRANCO',
  'VERDE',
] as const

const CORES_ACESSORIO = ['CROMO', 'INOX ESCOVADO', 'INOX POLIDO'] as const

function uniqSortCores(cores: string[]) {
  return [...new Set(cores.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
}

export function coresDimPadrao(): Record<TipoCorPrincipal, string[]> {
  return {
    PERFIL: uniqSortCores([...CORES_PERFIL, ...CORES_AMBOS]),
    VIDRO: uniqSortCores([...CORES_VIDRO, ...CORES_AMBOS]),
    ACESSORIO: uniqSortCores([...CORES_ACESSORIO, ...CORES_AMBOS]),
  }
}

/** GOLD / SUPREMA / 25 = perfil; TEMPERADO = vidro; demais perguntam. */
export function politicaDaLinha(
  codigo: string | null | undefined,
  stored?: string | null,
): PoliticaCorLinha {
  const linha = (codigo ?? '').trim().toUpperCase()
  if (linha === 'TEMPERADO') return 'VIDRO'
  if (linha === 'GOLD' || linha === 'SUPREMA' || linha === '25') return 'PERFIL'
  const raw = (stored ?? '').trim().toUpperCase()
  if (raw === 'PERFIL' || raw === 'VIDRO' || raw === 'PERGUNTAR') return raw
  return 'PERGUNTAR'
}

export function rotuloTipoCor(tipo: string): string {
  if (tipo === 'VIDRO') return 'Vidro'
  if (tipo === 'ACESSORIO') return 'Acessórios'
  return 'Perfil'
}

export function labelCorPrincipal(tipo: string): string {
  if (tipo === 'VIDRO') return 'Cor do vidro'
  if (tipo === 'ACESSORIO') return 'Cor dos acessórios'
  return 'Cor do perfil'
}

export function perguntaOptIn(tipo: TipoCorPrincipal): string {
  if (tipo === 'VIDRO') return 'Deseja informar a cor do vidro?'
  if (tipo === 'ACESSORIO') return 'Deseja informar a cor dos acessórios?'
  return 'Deseja informar a cor do perfil?'
}

export function slotsExtras(principal: TipoCorPrincipal): TipoCorPrincipal[] {
  return TIPOS_COR.filter((t) => t !== principal)
}

export function corPrincipalDoItem(item: {
  tipoCorPrincipal?: string | null
  cor?: string | null
  corPerfil?: string | null
  corVidro?: string | null
  corAcessorio?: string | null
}): string {
  const tipo = (item.tipoCorPrincipal ?? 'PERFIL').toUpperCase()
  if (tipo === 'VIDRO') return item.corVidro || item.cor || ''
  if (tipo === 'ACESSORIO') return item.corAcessorio || item.cor || ''
  return item.corPerfil || item.cor || ''
}

export function chipsCoresItem(item: {
  tipoCorPrincipal?: string | null
  cor?: string | null
  corPerfil?: string | null
  corVidro?: string | null
  corAcessorio?: string | null
}): Array<{ tipo: TipoCorPrincipal; cor: string }> {
  const chips: Array<{ tipo: TipoCorPrincipal; cor: string }> = []
  const perfil = item.corPerfil || (item.tipoCorPrincipal === 'PERFIL' ? item.cor : '')
  const vidro = item.corVidro || (item.tipoCorPrincipal === 'VIDRO' ? item.cor : '')
  const acessorio =
    item.corAcessorio || (item.tipoCorPrincipal === 'ACESSORIO' ? item.cor : '')
  if (perfil && perfil !== COR_SENTINELA) chips.push({ tipo: 'PERFIL', cor: perfil })
  if (vidro && vidro !== COR_SENTINELA) chips.push({ tipo: 'VIDRO', cor: vidro })
  if (acessorio && acessorio !== COR_SENTINELA) {
    chips.push({ tipo: 'ACESSORIO', cor: acessorio })
  }
  return chips
}

export function rotuloCoresItem(item: {
  produto?: string | null
  tipoCorPrincipal?: string | null
  cor?: string | null
  corPerfil?: string | null
  corVidro?: string | null
  corAcessorio?: string | null
}): string {
  const chips = chipsCoresItem(item)
    .map((c) => `${rotuloTipoCor(c.tipo)} ${c.cor}`)
    .join(' · ')
  return [item.produto, chips].filter(Boolean).join(' · ')
}
