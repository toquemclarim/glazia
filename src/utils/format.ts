import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DespesaFixa, Lancamento } from '../types'

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** Remove IDs/códigos internos (vnd_, ctl_, etc.) de textos da interface. */
export function textoSemCodigoInterno(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .replace(/\bRecebimento previsto da venda\s+\S+/gi, 'Recebimento previsto de venda')
    .replace(/\bVenda\s+(vnd_|vit_|flx_)[a-zA-Z0-9]+/gi, 'Venda')
    .replace(/\b(vnd_|vit_|flx_|ctl_|custo_cat_|pc_)[a-zA-Z0-9_-]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s·/|,;:.–—-]+$/g, '')
    .trim()
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

export function formatMonthLabel(monthKey: string): string {
  const date = parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date())
  return format(date, 'MMMM yyyy', { locale: ptBR })
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function isDespesaAtivaNoMes(despesa: DespesaFixa, monthKey: string): boolean {
  const mesInicio = startOfMonth(parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date()))
  const mesFim = endOfMonth(mesInicio)
  const inicio = parseISO(despesa.dataInicio)
  const fim = despesa.dataFim ? parseISO(despesa.dataFim) : new Date('2099-12-31')

  return (
    isWithinInterval(mesInicio, { start: inicio, end: fim }) ||
    isWithinInterval(mesFim, { start: inicio, end: fim }) ||
    (inicio <= mesInicio && fim >= mesFim)
  )
}

export function filtrarLancamentosPorMes(lancamentos: Lancamento[], monthKey: string): Lancamento[] {
  return lancamentos.filter((l) => getMonthKey(l.data) === monthKey)
}

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
