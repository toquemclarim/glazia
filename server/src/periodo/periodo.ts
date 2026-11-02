import type { DatabaseService } from '../database/database.service';

/** Janela [mesInicio, mesFim) do mês comercial. `fim` é o último dia incluído. */
export type PeriodoMes = {
  mes: string;
  diaInicio: number;
  mesInicio: string;
  mesFim: string;
  fim: string;
};

export function normalizarDiaInicio(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 28) return 1;
  return n;
}

function isoUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Mês rotulado por `YYYY-MM` começa no dia `diaInicio` desse mês
 * e termina na véspera do mesmo dia no mês seguinte.
 * Dia 1 reproduz o calendário civil.
 */
export function periodoDoMes(mes: string, diaInicio = 1): PeriodoMes {
  const dia = normalizarDiaInicio(diaInicio);
  const match = /^(\d{4})-(\d{2})$/.exec(mes.trim());
  if (!match) {
    throw new Error('Mês inválido');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error('Mês inválido');
  }
  const inicio = new Date(Date.UTC(year, month - 1, dia));
  const fimExclusivo = new Date(Date.UTC(year, month, dia));
  const fim = new Date(Date.UTC(year, month, dia - 1));
  return {
    mes: `${year}-${String(month).padStart(2, '0')}`,
    diaInicio: dia,
    mesInicio: isoUtc(inicio),
    mesFim: isoUtc(fimExclusivo),
    fim: isoUtc(fim),
  };
}

/** Período comercial que contém `agora` (UTC, como o restante da análise). */
export function mesAtualComercial(diaInicio: number, agora = new Date()): string {
  const dia = normalizarDiaInicio(diaInicio);
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth();
  const diaHoje = agora.getUTCDate();
  const base =
    diaHoje >= dia
      ? new Date(Date.UTC(ano, mes, 1))
      : new Date(Date.UTC(ano, mes - 1, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function carregarDiaInicioPeriodo(
  db: Pick<DatabaseService, 'query' | 'table'>,
  empresaId: string,
): Promise<number> {
  const [row] = await db.query<{ dia_inicio_periodo: number | null }>(
    `
    SELECT dia_inicio_periodo
    FROM ${db.table('dim_empresa')}
    WHERE id_empresa = @empresaId
    LIMIT 1
  `,
    { empresaId },
  );
  return normalizarDiaInicio(row?.dia_inicio_periodo);
}
