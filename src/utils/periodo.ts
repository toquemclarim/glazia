import type { PeriodoComercial } from '../types'
import { capitalize, formatMonthLabel } from './format'

/** Espelha server/src/periodo/periodo.ts. Dia 1 = calendário civil. */

export function normalizarDiaInicio(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor)
  if (!Number.isInteger(n) || n < 1 || n > 28) return 1
  return n
}

export type PeriodoMes = {
  mes: string
  diaInicio: number
  mesInicio: string
  mesFim: string
  fim: string
}

function isoUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function periodoDoMes(mes: string, diaInicio = 1): PeriodoMes {
  const dia = normalizarDiaInicio(diaInicio)
  const [year, month] = mes.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, dia))
  const fimExclusivo = new Date(Date.UTC(year, month, dia))
  const fim = new Date(Date.UTC(year, month, dia - 1))
  return {
    mes: `${year}-${String(month).padStart(2, '0')}`,
    diaInicio: dia,
    mesInicio: isoUtc(inicio),
    mesFim: isoUtc(fimExclusivo),
    fim: isoUtc(fim),
  }
}

export function mesAtualComercial(diaInicio: number, agora = new Date()): string {
  const dia = normalizarDiaInicio(diaInicio)
  const ano = agora.getUTCFullYear()
  const mes = agora.getUTCMonth()
  const diaHoje = agora.getUTCDate()
  const base =
    diaHoje >= dia
      ? new Date(Date.UTC(ano, mes, 1))
      : new Date(Date.UTC(ano, mes - 1, 1))
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}`
}

export function formatDiaCurto(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function rotuloPeriodo(mes: string, diaInicio = 1): string {
  const nome = capitalize(formatMonthLabel(mes))
  const dia = normalizarDiaInicio(diaInicio)
  if (dia <= 1) return nome
  const periodo = periodoDoMes(mes, dia)
  return `${nome} · ${formatDiaCurto(periodo.mesInicio)} a ${formatDiaCurto(periodo.fim)}`
}

/** Rótulo do mês selecionado usando as datas devolvidas pelo painel. */
export function rotuloComPeriodo(
  mes: string,
  periodo?: PeriodoComercial | null,
): string {
  const nome = capitalize(formatMonthLabel(mes))
  if (!periodo || periodo.diaInicio <= 1) return nome
  return `${nome} · ${formatDiaCurto(periodo.inicio)} a ${formatDiaCurto(periodo.fim)}`
}

export type CorteEscolha = '1' | '10' | '15' | 'outro'

export function escolhaDoDia(dia: number): {
  escolha: CorteEscolha
  outro: string
} {
  if (dia === 1 || dia === 10 || dia === 15) {
    return { escolha: String(dia) as CorteEscolha, outro: '20' }
  }
  return { escolha: 'outro', outro: String(normalizarDiaInicio(dia)) }
}

export function diaDaEscolha(escolha: string, outro: string): number | null {
  if (escolha === '1' || escolha === '10' || escolha === '15') {
    return Number(escolha)
  }
  if (escolha !== 'outro') return null
  const n = Number(outro)
  if (!Number.isInteger(n) || n < 1 || n > 28) return null
  return n
}
