import type { jsPDF } from 'jspdf'
import type { PainelSocios } from '../types'
import { capitalize, formatCurrency, formatMonthLabel } from './format'

/** Identidade Glazia (modo claro / impressão) */
const C = {
  paper: [247, 244, 239] as const,
  ink: [26, 22, 18] as const,
  muted: [106, 97, 88] as const,
  dim: [154, 145, 136] as const,
  accent: [160, 120, 80] as const,
  accentSoft: [232, 220, 204] as const,
  card: [255, 255, 255] as const,
  line: [220, 210, 198] as const,
  success: [45, 159, 111] as const,
  successSoft: [220, 242, 232] as const,
  danger: [196, 92, 74] as const,
  dangerSoft: [248, 228, 224] as const,
  warn: [184, 130, 48] as const,
}

type RGB = readonly [number, number, number]
type Doc = InstanceType<typeof jsPDF> & {
  lastAutoTable?: { finalY: number }
}

function mesLabel(mes: string) {
  return capitalize(formatMonthLabel(mes))
}

function money(v: number) {
  return formatCurrency(v)
}

/** Valores curtos para barras (evita corte no gráfico). */
function moneyShort(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) {
    return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`
  }
  if (abs >= 1000) {
    return `R$ ${(v / 1000).toFixed(1).replace('.', ',')} mil`
  }
  return money(v)
}

function pct(v: number) {
  if (!Number.isFinite(v)) return '—'
  return `${v.toFixed(1).replace('.', ',')}%`
}

function setFill(doc: Doc, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2])
}

function setStroke(doc: Doc, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2])
}

function setText(doc: Doc, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2])
}

function pageW(doc: Doc) {
  return doc.internal.pageSize.getWidth()
}

function pageH(doc: Doc) {
  return doc.internal.pageSize.getHeight()
}

function roundedRect(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: 'F' | 'S' | 'FD' = 'F',
) {
  doc.roundedRect(x, y, w, h, r, r, style)
}

function truncate(doc: Doc, text: string, maxW: number) {
  if (doc.getTextWidth(text) <= maxW) return text
  let t = text
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) {
    t = t.slice(0, -1)
  }
  return `${t}…`
}

function ensureSpace(doc: Doc, y: number, need: number, marginBottom = 18) {
  if (y + need <= pageH(doc) - marginBottom) return y
  doc.addPage()
  paintPageBackground(doc)
  // Faixa de continuidade (sem repetir o cabeçalho completo).
  setFill(doc, C.accent)
  doc.rect(0, 0, pageW(doc), 1.8, 'F')
  return 12
}

function paintPageBackground(doc: Doc) {
  setFill(doc, C.paper)
  doc.rect(0, 0, pageW(doc), pageH(doc), 'F')
}

function drawFooter(doc: Doc, pageIndex: number, totalPages?: number) {
  const w = pageW(doc)
  const h = pageH(doc)
  setStroke(doc, C.line)
  doc.setLineWidth(0.3)
  doc.line(14, h - 12, w - 14, h - 12)
  setText(doc, C.dim)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Glazia · Gestão financeira para vidraçarias', 14, h - 7)
  const label =
    totalPages != null
      ? `Página ${pageIndex} de ${totalPages}`
      : `Página ${pageIndex}`
  doc.text(label, w - 14, h - 7, { align: 'right' })
}

function drawBrandHeader(
  doc: Doc,
  y: number,
  opts: { titulo: string; subtitulo: string; geradoEm: string },
) {
  const w = pageW(doc)
  // faixa bronze
  setFill(doc, C.ink)
  doc.rect(0, 0, w, 28, 'F')
  setFill(doc, C.accent)
  doc.rect(0, 28, w, 2.2, 'F')

  setText(doc, [255, 255, 255])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('GLAZIA', 14, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setText(doc, C.accentSoft)
  doc.text('Analytics · vidraçarias & esquadrias', 14, 20)

  setText(doc, [255, 255, 255])
  doc.setFontSize(8)
  doc.text(opts.geradoEm, w - 14, 13, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(opts.titulo, w - 14, 21, { align: 'right' })

  let yy = y + 36
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setText(doc, C.ink)
  doc.text(opts.subtitulo, 14, yy)
  yy += 6
  return yy
}

function drawVerdictBanner(
  doc: Doc,
  y: number,
  ok: boolean,
  title: string,
  body: string,
) {
  const w = pageW(doc) - 28
  const h = 22
  setFill(doc, ok ? C.successSoft : C.dangerSoft)
  setStroke(doc, ok ? C.success : C.danger)
  doc.setLineWidth(0.6)
  roundedRect(doc, 14, y, w, h, 3, 'FD')

  setFill(doc, ok ? C.success : C.danger)
  doc.circle(22, y + h / 2, 3.2, 'F')

  setText(doc, ok ? C.success : C.danger)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(title, 30, y + 8.5)

  setText(doc, C.ink)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const lines = doc.splitTextToSize(body, w - 22)
  doc.text(lines.slice(0, 2), 30, y + 15)
  return y + h + 8
}

function drawKpiGrid(
  doc: Doc,
  y: number,
  items: Array<{ label: string; value: string; tone?: 'ok' | 'bad' | 'neutral' }>,
) {
  const gap = 4
  const cols = Math.min(4, items.length)
  const totalW = pageW(doc) - 28
  const cardW = (totalW - gap * (cols - 1)) / cols
  const cardH = 22

  items.slice(0, cols).forEach((item, i) => {
    const x = 14 + i * (cardW + gap)
    setFill(doc, C.card)
    setStroke(doc, C.line)
    doc.setLineWidth(0.35)
    roundedRect(doc, x, y, cardW, cardH, 2.5, 'FD')
    setFill(doc, C.accent)
    doc.rect(x, y, 1.6, cardH, 'F')

    setText(doc, C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(item.label.toUpperCase(), x + 5, y + 7)

    const tone =
      item.tone === 'ok' ? C.success : item.tone === 'bad' ? C.danger : C.ink
    setText(doc, tone)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(truncate(doc, item.value, cardW - 10), x + 5, y + 16)
  })

  return y + cardH + 8
}

function drawSectionTitle(doc: Doc, y: number, title: string, hint?: string) {
  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(title, 14, y)
  if (hint) {
    setText(doc, C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(hint, pageW(doc) - 14, y, { align: 'right' })
  }
  setStroke(doc, C.accent)
  doc.setLineWidth(0.8)
  doc.line(14, y + 2.5, 42, y + 2.5)
  return y + 8
}

/** Cascata visual: Faturamento → variáveis → fixos → lucro */
function drawWaterfall(
  doc: Doc,
  y: number,
  parts: Array<{ label: string; value: number; kind: 'in' | 'out' | 'result' }>,
) {
  const boxX = 14
  const boxW = pageW(doc) - 28
  const boxH = 48
  setFill(doc, C.card)
  setStroke(doc, C.line)
  doc.setLineWidth(0.35)
  roundedRect(doc, boxX, y, boxW, boxH, 3, 'FD')

  const maxAbs = Math.max(...parts.map((p) => Math.abs(p.value)), 1)
  const barMaxH = 26
  const baseY = y + 36
  const slotW = boxW / parts.length

  parts.forEach((p, i) => {
    const cx = boxX + slotW * i + slotW / 2
    const h = Math.max(3, (Math.abs(p.value) / maxAbs) * barMaxH)
    const color =
      p.kind === 'in' ? C.accent : p.kind === 'out' ? C.danger : p.value >= 0 ? C.success : C.danger
    setFill(doc, color)
    const barW = Math.min(18, slotW - 10)
    doc.roundedRect(cx - barW / 2, baseY - h, barW, h, 1, 1, 'F')

    setText(doc, C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(p.label, cx, y + 7, { align: 'center' })

    setText(doc, C.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    const sign = p.kind === 'out' ? '−' : p.kind === 'result' && p.value > 0 ? '+' : ''
    doc.text(`${sign}${money(Math.abs(p.value))}`, cx, y + 12.5, {
      align: 'center',
      maxWidth: slotW - 4,
    })
  })

  return y + boxH + 8
}

function drawHBars(
  doc: Doc,
  y: number,
  rows: Array<{ label: string; value: number; sub?: string }>,
  opts?: { valueColor?: (v: number) => RGB },
) {
  if (!rows.length) {
    setText(doc, C.muted)
    doc.setFontSize(8)
    doc.text('Sem dados neste período.', 14, y)
    return y + 10
  }

  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  const labelW = 42
  const valueW = 32
  const barX = 14 + labelW
  const barW = pageW(doc) - 28 - labelW - valueW - 4
  let yy = y

  for (const row of rows) {
    yy = ensureSpace(doc, yy, 10)
    setText(doc, C.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(truncate(doc, row.label, labelW - 2), 14, yy + 3.5)

    setFill(doc, C.accentSoft)
    roundedRect(doc, barX, yy, barW, 5, 1, 'F')
    const fillW = Math.max(1.5, (Math.abs(row.value) / max) * barW)
    const fillColor = opts?.valueColor?.(row.value) ?? (row.value >= 0 ? C.accent : C.danger)
    setFill(doc, fillColor)
    roundedRect(doc, barX, yy, fillW, 5, 1, 'F')

    setText(doc, row.value >= 0 ? C.ink : C.danger)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(money(row.value), pageW(doc) - 14, yy + 3.5, { align: 'right' })
    yy += 9
  }
  return yy + 4
}

function drawCompareCards(
  doc: Doc,
  y: number,
  left: {
    title: string
    status: string
    ok: boolean
    rows: Array<{ k: string; v: string }>
  },
  right: {
    title: string
    status: string
    ok: boolean
    rows: Array<{ k: string; v: string }>
  },
) {
  const gap = 5
  const cardW = (pageW(doc) - 28 - gap) / 2
  const cardH = 52

  const paint = (
    x: number,
    data: typeof left,
  ) => {
    setFill(doc, C.card)
    setStroke(doc, C.line)
    doc.setLineWidth(0.35)
    roundedRect(doc, x, y, cardW, cardH, 3, 'FD')
    setFill(doc, data.ok ? C.success : C.danger)
    doc.rect(x, y, cardW, 1.8, 'F')

    setText(doc, C.muted)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(data.title.toUpperCase(), x + 5, y + 8)

    setText(doc, data.ok ? C.success : C.danger)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(data.status, x + 5, y + 15)

    let yy = y + 22
    data.rows.forEach((r) => {
      setText(doc, C.muted)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(r.k, x + 5, yy)
      setText(doc, C.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.text(r.v, x + cardW - 5, yy, { align: 'right' })
      yy += 7
    })
  }

  paint(14, left)
  paint(14 + cardW + gap, right)
  return y + cardH + 8
}

function drawProgressRow(
  doc: Doc,
  y: number,
  label: string,
  atual: number,
  meta: number | null,
  hint: string,
) {
  const w = pageW(doc) - 28
  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(label, 14, y)
  setText(doc, C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(hint, pageW(doc) - 14, y, { align: 'right' })

  const barY = y + 3
  setFill(doc, C.accentSoft)
  roundedRect(doc, 14, barY, w, 6, 1.5, 'F')

  if (meta != null && meta > 0) {
    const ratio = Math.min(1, Math.max(0, atual / meta))
    setFill(doc, ratio >= 1 ? C.success : C.accent)
    roundedRect(doc, 14, barY, Math.max(2, w * ratio), 6, 1.5, 'F')
    setText(doc, C.ink)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(
      `${money(atual)}  ·  meta ${money(meta)}  (${pct(ratio * 100)})`,
      14,
      barY + 12,
    )
  } else {
    setText(doc, C.muted)
    doc.setFontSize(7)
    doc.text(`${money(atual)} · meta indisponível neste mês`, 14, barY + 12)
  }
  return barY + 18
}

function styledTable(
  doc: Doc,
  autoTable: (d: Doc, o: object) => void,
  startY: number,
  head: string[],
  body: (string | number)[][],
) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    margin: { left: 14, right: 14, bottom: 16 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.4,
      textColor: C.ink as unknown as number[],
      lineColor: C.line as unknown as number[],
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.ink as unknown as number[],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [252, 249, 245] as unknown as number[],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
    },
  })
  return doc.lastAutoTable?.finalY ?? startY
}

/**
 * Relatório executivo do mês — gestão à vista para dono de vidraçaria.
 */
export async function gerarRelatorioPdf(painel: PainelSocios) {
  const { jsPDF } = await import('jspdf')
  const mod = (await import('jspdf-autotable')) as unknown as {
    default: (doc: Doc, options: object) => void
  }
  const autoTable = mod.default

  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as Doc
  const {
    resultado,
    rentabilidade,
    custosFixos,
    projecao,
    fluxoCaixa,
    contasAReceber,
    visaoMes,
  } = painel

  const periodo = mesLabel(painel.mes)
  const geradoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // —— Página 1: Gestão à vista ——
  paintPageBackground(doc)
  let y = drawBrandHeader(doc, 0, {
    titulo: 'Relatório do mês',
    subtitulo: periodo,
    geradoEm: `Gerado em ${geradoEm}`,
  })

  setText(doc, C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(
    'Leitura rápida para decisão: o que vendeu, o que sobrou e o que entrou de dinheiro.',
    14,
    y,
  )
  y += 7

  const lucroOk = resultado.lucrativo
  y = drawVerdictBanner(
    doc,
    y,
    lucroOk,
    lucroOk ? 'Mês rentável no DRE' : 'Mês não rentável no DRE',
    lucroOk
      ? `A operação gerou lucro de ${money(resultado.lucroOperacional)} sobre o que foi vendido em ${periodo}.`
      : `A operação fechou com ${money(resultado.lucroOperacional)}. Revise mix, preços e custos fixos antes do próximo ciclo.`,
  )

  y = drawKpiGrid(doc, y, [
    {
      label: 'Faturamento',
      value: money(resultado.faturamento),
      tone: 'neutral',
    },
    {
      label: 'Lucro operacional',
      value: money(resultado.lucroOperacional),
      tone: lucroOk ? 'ok' : 'bad',
    },
    {
      label: 'Margem contrib.',
      value: pct(resultado.margemPercentual),
      tone: resultado.margemPercentual >= 30 ? 'ok' : 'neutral',
    },
    {
      label: 'Caixa realizado',
      value: money(fluxoCaixa?.saldoRealizado ?? 0),
      tone: (fluxoCaixa?.saldoRealizado ?? 0) >= 0 ? 'ok' : 'bad',
    },
  ])

  y = drawSectionTitle(
    doc,
    y,
    'Como o lucro foi formado',
    'Faturamento − variáveis − fixos',
  )
  y = drawWaterfall(doc, y, [
    { label: 'Faturamento', value: resultado.faturamento, kind: 'in' },
    { label: 'Custos var.', value: resultado.custosVariaveis, kind: 'out' },
    { label: 'Custos fixos', value: resultado.custosFixos, kind: 'out' },
    { label: 'Lucro', value: resultado.lucroOperacional, kind: 'result' },
  ])

  y = drawSectionTitle(doc, y, 'DRE × Caixa', 'Competência vs dinheiro')
  y = drawCompareCards(
    doc,
    y,
    {
      title: 'Resultado (DRE)',
      status: lucroOk ? 'No azul' : 'No vermelho',
      ok: lucroOk,
      rows: [
        { k: 'Faturamento (vendas)', v: money(resultado.faturamento) },
        { k: 'Custos variáveis', v: money(resultado.custosVariaveis) },
        { k: 'Custos fixos', v: money(resultado.custosFixos) },
        { k: 'Lucro operacional', v: money(resultado.lucroOperacional) },
      ],
    },
    {
      title: 'Fluxo de caixa',
      status: fluxoCaixa?.caixaPositivoRealizado
        ? 'Caixa no azul'
        : fluxoCaixa?.caixaPositivoPrevisto
          ? 'Previsto positivo'
          : 'Caixa apertado',
      ok: Boolean(
        fluxoCaixa?.caixaPositivoRealizado ?? fluxoCaixa?.caixaPositivoPrevisto,
      ),
      rows: [
        {
          k: 'Entradas previstas',
          v: money(fluxoCaixa?.entradasPrevistas ?? 0),
        },
        {
          k: 'Entradas recebidas',
          v: money(fluxoCaixa?.entradasRecebidas ?? 0),
        },
        { k: 'Saídas pagas', v: money(fluxoCaixa?.saidasPagas ?? 0) },
        {
          k: 'Saldo realizado',
          v: money(fluxoCaixa?.saldoRealizado ?? 0),
        },
      ],
    },
  )

  setText(doc, C.muted)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  const leitura =
    visaoMes?.leitura ||
    'DRE = o que foi vendido no mês. Caixa = o que entrou/saiu de dinheiro — pode ser de vendas de outros meses.'
  const leituraLines = doc.splitTextToSize(leitura, pageW(doc) - 28)
  doc.text(leituraLines, 14, y)
  y += leituraLines.length * 3.5 + 6

  y = ensureSpace(doc, y, 36)
  y = drawSectionTitle(doc, y, 'Rumo à meta', 'Gestão à vista')
  y = drawProgressRow(
    doc,
    y,
    'Faturamento × meta confortável',
    resultado.faturamento,
    projecao.metaConfortavelFaturamento,
    projecao.cobreCustosFixos ? 'Cobre os fixos' : 'Ainda não cobre os fixos',
  )
  y = drawProgressRow(
    doc,
    y,
    'Faturamento × ponto de equilíbrio',
    resultado.faturamento,
    projecao.pontoEquilibrioFaturamento,
    'Mínimo para zerar o mês',
  )

  // Insights rápidos
  y = ensureSpace(doc, y, 28)
  setFill(doc, C.accentSoft)
  roundedRect(doc, 14, y, pageW(doc) - 28, 26, 3, 'F')
  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('O que olhar amanhã na oficina', 18, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setText(doc, C.muted)
  const topLinha = [...(rentabilidade.porLinha ?? [])].sort(
    (a, b) => b.lucro - a.lucro,
  )[0]
  const piorProduto = rentabilidade.menosRentavel
  const receberAberto = contasAReceber?.totalEmAberto ?? 0
  const bullets = [
    topLinha
      ? `• Linha que mais lucrou: ${topLinha.linha} (${money(topLinha.lucro)}) — priorize esse mix.`
      : '• Ainda sem linhas com lucro no período — lance vendas com custos atrelados.',
    piorProduto
      ? `• Atenção: ${piorProduto.produto} com lucro ${money(piorProduto.lucro)} — revise preço ou desperdício.`
      : '• Sem alerta de produto fraco neste recorte.',
    receberAberto > 0
      ? `• Contas a receber em aberto: ${money(receberAberto)} — cobre clientes com vencimento próximo.`
      : '• Nenhuma conta a receber em aberto neste mês.',
  ]
  bullets.forEach((b, i) => {
    doc.text(truncate(doc, b, pageW(doc) - 40), 18, y + 13 + i * 4)
  })

  // —— Página 2: Mix ——
  doc.addPage()
  paintPageBackground(doc)
  y = drawBrandHeader(doc, 0, {
    titulo: 'Mix & rentabilidade',
    subtitulo: periodo,
    geradoEm: `Gerado em ${geradoEm}`,
  })

  y = drawSectionTitle(
    doc,
    y,
    'Lucro por linha',
    'Onde a vidraçaria ganha de verdade',
  )
  const linhas = [...(rentabilidade.porLinha ?? [])]
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 8)
    .map((l) => ({ label: l.linha || 'Sem linha', value: l.lucro }))
  y = drawHBars(doc, y, linhas, {
    valueColor: (v) => (v >= 0 ? C.success : C.danger),
  })

  y = ensureSpace(doc, y, 20)
  y = drawSectionTitle(doc, y, 'Top produtos', 'Receita, custo e lucro')
  const produtos = [...rentabilidade.porProduto]
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 12)
  y = styledTable(
    doc,
    autoTable,
    y,
    ['Produto', 'Linha', 'Receita', 'Custo', 'Lucro', 'Vendas'],
    produtos.map((p) => [
      p.produto,
      p.linha ?? '—',
      money(p.receita),
      money(p.custo),
      money(p.lucro),
      String(p.qtdVendas),
    ]),
  )
  y += 8

  if (rentabilidade.porCliente?.length) {
    y = ensureSpace(doc, y, 24)
    y = drawSectionTitle(doc, y, 'Top clientes', 'Quem mais contribuiu no mês')
    const clientes = [...rentabilidade.porCliente]
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 8)
    y = styledTable(
      doc,
      autoTable,
      y,
      ['Cliente', 'Receita', 'Custo', 'Lucro', 'Vendas'],
      clientes.map((c) => [
        c.cliente,
        money(c.receita),
        money(c.custo),
        money(c.lucro),
        String(c.qtdVendas),
      ]),
    )
    y += 6
  }

  // Destaques mais/menos
  y = ensureSpace(doc, y, 30)
  const half = (pageW(doc) - 28 - 4) / 2
  const paintHighlight = (
    x: number,
    title: string,
    name: string,
    value: string,
    ok: boolean,
  ) => {
    setFill(doc, ok ? C.successSoft : C.dangerSoft)
    roundedRect(doc, x, y, half, 20, 2.5, 'F')
    setText(doc, ok ? C.success : C.danger)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(title.toUpperCase(), x + 4, y + 6)
    setText(doc, C.ink)
    doc.setFontSize(9)
    doc.text(truncate(doc, name, half - 8), x + 4, y + 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(value, x + 4, y + 17)
  }
  if (rentabilidade.maisRentavel) {
    paintHighlight(
      14,
      'Mais rentável',
      rentabilidade.maisRentavel.produto,
      money(rentabilidade.maisRentavel.lucro),
      true,
    )
  }
  if (rentabilidade.menosRentavel) {
    paintHighlight(
      14 + half + 4,
      'Menos rentável',
      rentabilidade.menosRentavel.produto,
      money(rentabilidade.menosRentavel.lucro),
      false,
    )
  }

  // —— Página 3: Caixa operacional ——
  doc.addPage()
  paintPageBackground(doc)
  y = drawBrandHeader(doc, 0, {
    titulo: 'Caixa & compromissos',
    subtitulo: periodo,
    geradoEm: `Gerado em ${geradoEm}`,
  })

  y = drawKpiGrid(doc, y, [
    {
      label: 'A receber (mês)',
      value: money(contasAReceber?.totalPrevisto ?? 0),
    },
    {
      label: 'Já recebido',
      value: money(contasAReceber?.totalRecebido ?? 0),
      tone: 'ok',
    },
    {
      label: 'Em aberto',
      value: money(contasAReceber?.totalEmAberto ?? 0),
      tone: (contasAReceber?.totalEmAberto ?? 0) > 0 ? 'bad' : 'ok',
    },
    {
      label: 'Fixos do mês',
      value: money(custosFixos.totalPrevisto || custosFixos.totalMensalVigente || 0),
    },
  ])

  y = drawSectionTitle(
    doc,
    y,
    'Contas a receber',
    'Quem deve — e o que já entrou',
  )
  const receberRows = (contasAReceber?.itens ?? []).slice(0, 14)
  if (receberRows.length === 0) {
    setText(doc, C.muted)
    doc.setFontSize(8)
    doc.text('Nenhuma entrada prevista neste mês.', 14, y)
    y += 10
  } else {
    y = styledTable(
      doc,
      autoTable,
      y,
      ['Vencimento', 'Cliente', 'Valor', 'Status'],
      receberRows.map((i) => [
        i.dataVencimento.split('-').reverse().join('/'),
        i.cliente || i.descricao || '—',
        money(i.valorPrevisto),
        i.recebido ? 'Recebido' : 'Em aberto',
      ]),
    )
    y += 8
  }

  y = ensureSpace(doc, y, 24)
  y = drawSectionTitle(
    doc,
    y,
    'Custos fixos',
    'O que pesa todo mês na vidraçaria',
  )
  const fixos = (custosFixos.vigentes?.length
    ? custosFixos.vigentes.map((v) => ({
        nome: v.descricao,
        venc: '—',
        valor: v.valorMensal,
        status: 'Vigente',
      }))
    : custosFixos.itens.map((i) => ({
        nome: [i.categoria, i.subcategoria].filter(Boolean).join(' / ') || 'Custo',
        venc: i.dataVencimento?.split('-').reverse().join('/') ?? '—',
        valor: i.valorPrevisto,
        status: i.status,
      }))
  ).slice(0, 14)

  if (!fixos.length) {
    setText(doc, C.muted)
    doc.setFontSize(8)
    doc.text('Nenhum custo fixo cadastrado para o período.', 14, y)
    y += 10
  } else {
    y = styledTable(
      doc,
      autoTable,
      y,
      ['Descrição', 'Vencimento', 'Valor', 'Status'],
      fixos.map((f) => [f.nome, f.venc, money(f.valor), f.status]),
    )
    y += 8
  }

  y = ensureSpace(doc, y, 32)
  setFill(doc, C.card)
  setStroke(doc, C.line)
  doc.setLineWidth(0.35)
  roundedRect(doc, 14, y, pageW(doc) - 28, 28, 3, 'FD')
  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Fechamento do mês — checklist do dono', 18, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setText(doc, C.muted)
  const checklist = [
    `1. Conferir contas a receber em aberto (${money(contasAReceber?.totalEmAberto ?? 0)}) e marcar Recebido quando o cliente pagar.`,
    `2. Validar se o faturamento cobre os fixos: ${projecao.cobreCustosFixos ? 'sim' : 'ainda não'} (sobra/falta ${money(projecao.sobraOuFalta)}).`,
    `3. Empurrar a linha/produto mais rentável e revisar o item com pior lucro antes de fechar orçamentos.`,
    `4. Meta confortável: ${projecao.metaConfortavelFaturamento == null ? '—' : money(projecao.metaConfortavelFaturamento)} · equilíbrio: ${projecao.pontoEquilibrioFaturamento == null ? '—' : money(projecao.pontoEquilibrioFaturamento)}.`,
  ]
  checklist.forEach((line, i) => {
    doc.text(doc.splitTextToSize(line, pageW(doc) - 40)[0], 18, y + 13 + i * 4)
  })

  // Numeração de páginas
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i)
    // re-paint footer strip cleanly
    const h = pageH(doc)
    setFill(doc, C.paper)
    doc.rect(0, h - 14, pageW(doc), 14, 'F')
    drawFooter(doc, i, total)
  }

  doc.save(`glazia-relatorio-${painel.mes}.pdf`)
}
