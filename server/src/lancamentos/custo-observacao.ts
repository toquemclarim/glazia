const PREFIXO_OBS = 'obs:';

function partesDe(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(' | ')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function parseCatCustoId(observacao: string | null | undefined): number | null {
  if (!observacao) return null;
  const m = observacao.match(/cat_custo:(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isMetadado(part: string): boolean {
  return (
    /^cat_custo:\d+$/i.test(part) ||
    /^destino:/i.test(part) ||
    /^espessura /i.test(part) ||
    /^obs:/i.test(part)
  );
}

export function parseObservacaoCusto(raw: string | null | undefined): {
  descricao: string;
  observacao: string | null;
  idCustoCatalogo: number;
  espessura: string | null;
  destino: string | null;
} {
  const partes = partesDe(raw);
  const descricao = partes[0] || 'Custo de estoque';
  const espessuraPart = partes.find((p) => /^espessura /i.test(p));
  const destinoPart = partes.find((p) => /^destino:/i.test(p));
  const obsPart = partes.find((p) => /^obs:/i.test(p));
  const observacao = obsPart
    ? obsPart.slice(PREFIXO_OBS.length).trim() || null
    : partes
        .slice(1)
        .filter((p) => !isMetadado(p))
        .join(' | ') || null;

  return {
    descricao,
    observacao,
    idCustoCatalogo: parseCatCustoId(raw) ?? 0,
    espessura: espessuraPart
      ? espessuraPart.replace(/^espessura\s+/i, '').trim() || null
      : null,
    destino: destinoPart
      ? destinoPart.replace(/^destino:\s*/i, '').trim() || null
      : null,
  };
}

export function montarObservacaoCusto(opts: {
  descricao: string;
  espessura?: string | null;
  destino?: string | null;
  observacao?: string | null;
  idCustoCatalogo: number;
}): string {
  return [
    opts.descricao.trim() || 'Custo de estoque',
    opts.espessura?.trim() ? `espessura ${opts.espessura.trim()}` : null,
    opts.destino?.trim() ? `Destino: ${opts.destino.trim()}` : null,
    opts.observacao?.trim() ? `${PREFIXO_OBS}${opts.observacao.trim()}` : null,
    `cat_custo:${opts.idCustoCatalogo}`,
  ]
    .filter(Boolean)
    .join(' | ');
}
