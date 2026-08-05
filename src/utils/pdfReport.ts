import type { jsPDF } from 'jspdf'
import type { PainelSocios } from '../types'
import { capitalize, formatCurrency, formatMonthLabel } from './format'

/** Identidade Glazia para impressão (modo claro) */
const C = {
  paper: [246, 242, 236] as const,
  paperDeep: [238, 232, 222] as const,
  ink: [22, 18, 14] as const,
  muted: [98, 88, 78] as const,
  dim: [148, 138, 128] as const,
  accent: [160, 120, 80] as const,
  accentDeep: [122, 88, 52] as const,
  accentSoft: [232, 220, 204] as const,
  card: [255, 253, 250] as const,
  line: [214, 204, 190] as const,
  success: [31, 122, 85] as const,
  successSoft: [222, 240, 230] as const,
  danger: [176, 68, 56] as const,
  dangerSoft: [248, 228, 224] as const,
  white: [255, 255, 255] as const,
}

const MARGIN = 16
const FOOTER_H = 14

type RGB = readonly [number, number, number]
type Doc = InstanceType<typeof jsPDF> & {
  lastAutoTable?: { finalY: number }
}

export type PdfReportOptions = {
  empresaNome?: string | null
}

function mesLabel(mes: string) {
  return capitalize(formatMonthLabel(mes))
}

function money(v: number) {
  return formatCurrency(v)
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

function contentW(doc: Doc) {
  return pageW(doc) - MARGIN * 2
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

type LogoAssets = {
  full: string
  mark: string
}

async function loadPngDataUrl(path: string): Promise<string> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Falha ao carregar ${path}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Falha ao ler ${path}`))
    reader.readAsDataURL(blob)
  })
}

async function loadLogoAssets(): Promise<LogoAssets> {
  const [full, mark] = await Promise.all([
    loadPngDataUrl('/logo-full-clear.png'),
    loadPngDataUrl('/logo-mark-clear.png').catch(() =>
      loadPngDataUrl('/logo-full-clear.png'),
    ),
  ])
  return { full, mark }
}

function paintPageBackground(doc: Doc) {
  setFill(doc, C.paper)
  doc.rect(0, 0, pageW(doc), pageH(doc), 'F')
  setFill(doc, C.paperDeep)
  doc.rect(0, 0, pageW(doc), 4, 'F')
}

function drawFooter(
  doc: Doc,
  pageIndex: number,
  totalPages: number,
  logos: LogoAssets,
) {
  const w = pageW(doc)
  const h = pageH(doc)
  setFill(doc, C.paper)
  doc.rect(0, h - FOOTER_H, w, FOOTER_H, 'F')
  setStroke(doc, C.line)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, h - FOOTER_H + 2, w - MARGIN, h - FOOTER_H + 2)

  // logotipo pequeno no rodapé (sem texto tipado)
  const logoH = 5.5
  const logoW = logoH * (576 / 199)
  doc.addImage(logos.full, 'PNG', MARGIN, h - 9.2, logoW, logoH)

  setText(doc, C.dim)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Financeiro para vidraçarias', MARGIN + logoW + 3, h - 5)
  doc.text(`Página ${pageIndex} de ${totalPages}`, w - MARGIN, h - 5, {
    align: 'right',
  })
}

function ensureSpace(
  doc: Doc,
  y: number,
  need: number,
  ctx: { periodo: string; secao: string; logos: LogoAssets },
) {
  if (y + need <= pageH(doc) - FOOTER_H - 4) return y
  doc.addPage()
  paintPageBackground(doc)
  return drawContinuityHeader(doc, ctx.periodo, ctx.secao, ctx.logos)
}

function drawContinuityHeader(
  doc: Doc,
  periodo: string,
  secao: string,
  logos: LogoAssets,
) {
  const w = pageW(doc)
  setFill(doc, C.card)
  doc.rect(0, 0, w, 14, 'F')
  setFill(doc, C.accent)
  doc.rect(0, 14, w, 1.6, 'F')

  const logoH = 8
  const logoW = logoH * (576 / 199)
  doc.addImage(logos.full, 'PNG', MARGIN, 3, logoW, logoH)

  setText(doc, C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`${secao}  ·  ${periodo}`, w - MARGIN, 8.5, { align: 'right' })
  return 20
}

function drawCoverHeader(
  doc: Doc,
  opts: {
    empresaNome: string
    periodo: string
    geradoEm: string
    logos: LogoAssets
  },
) {
  const w = pageW(doc)

  // faixa clara para o logotipo oficial aparecer nítido
  setFill(doc, C.card)
  doc.rect(0, 0, w, 38, 'F')
  setFill(doc, C.accent)
  doc.rect(0, 38, w, 2.2, 'F')
  setStroke(doc, C.line)
  doc.setLineWidth(0.25)
  doc.line(0, 0, w, 0)

  const logoH = 16
  const logoW = logoH * (576 / 199)
  doc.addImage(opts.logos.full, 'PNG', MARGIN, 8, logoW, logoH)

  setText(doc, C.dim)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`Gerado em ${opts.geradoEm}`, w - MARGIN, 14, { align: 'right' })
  setText(doc, C.accentDeep)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RELATÓRIO DO MÊS', w - MARGIN, 22, { align: 'right' })

  setText(doc, C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Gestão financeira · vidraçarias & esquadrias', MARGIN, 30)

  let y = 48
  setText(doc, C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('EMPRESA', MARGIN, y)

  y += 6
  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(truncate(doc, opts.empresaNome, contentW(doc)), MARGIN, y)

  y += 8
  setText(doc, C.accentDeep)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(opts.periodo, MARGIN, y)

  y += 5
  setFill(doc, C.accent)
  roundedRect(doc, MARGIN, y, 22, 1.2, 0.5, 'F')

  y += 6
  setText(doc, C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(
    'Leitura rápida para decisão: o que vendeu, o que sobrou e o que entrou de dinheiro.',
    MARGIN,
    y,
  )
  return y + 8
}

function drawVerdictBanner(
  doc: Doc,
  y: number,
  ok: boolean,
  title: string,
  body: string,
) {
  const w = contentW(doc)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const lines = doc.splitTextToSize(body, w - 22)
  const h = Math.max(20, 12 + lines.length * 3.8)

  setFill(doc, ok ? C.successSoft : C.dangerSoft)
  setStroke(doc, ok ? C.success : C.danger)
  doc.setLineWidth(0.45)
  roundedRect(doc, MARGIN, y, w, h, 3.5, 'FD')

  setFill(doc, ok ? C.success : C.danger)
  roundedRect(doc, MARGIN, y, 2.2, h, 1, 'F')

  // marcador
  setFill(doc, ok ? C.success : C.danger)
  doc.circle(MARGIN + 9, y + 8, 2.6, 'F')
  setText(doc, C.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(ok ? '✓' : '!', MARGIN + 9, y + 9.2, { align: 'center' })

  setText(doc, ok ? C.success : C.danger)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text(title, MARGIN + 16, y + 8.5)

  setText(doc, C.ink)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(lines, MARGIN + 16, y + 14)
  return y + h + 7
}

function drawKpiGrid(
  doc: Doc,
  y: number,
  items: Array<{ label: string; value: string; tone?: 'ok' | 'bad' | 'neutral' }>,
) {
  const gap = 3.5
  const cols = Math.min(4, items.length)
  const totalW = contentW(doc)
  const cardW = (totalW - gap * (cols - 1)) / cols
  const cardH = 24

  items.slice(0, cols).forEach((item, i) => {
    const x = MARGIN + i * (cardW + gap)

    // sombra leve
    setFill(doc, C.paperDeep)
    roundedRect(doc, x + 0.6, y + 0.7, cardW, cardH, 3, 'F')

    setFill(doc, C.card)
    setStroke(doc, C.line)
    doc.setLineWidth(0.3)
    roundedRect(doc, x, y, cardW, cardH, 3, 'FD')

    setFill(doc, C.accent)
    roundedRect(doc, x, y, 1.8, cardH, 0.8, 'F')

    setText(doc, C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(item.label.toUpperCase(), x + 5.5, y + 7.5)

    const tone =
      item.tone === 'ok' ? C.success : item.tone === 'bad' ? C.danger : C.ink
    setText(doc, tone)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(truncate(doc, item.value, cardW - 10), x + 5.5, y + 17)
  })

  return y + cardH + 8
}

function drawSectionTitle(doc: Doc, y: number, title: string, hint?: string) {
  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(title, MARGIN, y)
  if (hint) {
    setText(doc, C.dim)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(hint, pageW(doc) - MARGIN, y, { align: 'right' })
  }
  setFill(doc, C.accent)
  roundedRect(doc, MARGIN, y + 2.2, 18, 1.1, 0.5, 'F')
  return y + 8
}

/** Cascata contábil real: cada barra parte do nível acumulado */
function drawWaterfall(
  doc: Doc,
  y: number,
  parts: Array<{ label: string; value: number; kind: 'in' | 'out' | 'result' }>,
) {
  const boxX = MARGIN
  const boxW = contentW(doc)
  const boxH = 56
  const padX = 8
  const padTop = 14
  const chartH = 30
  const baseY = y + padTop + chartH

  setFill(doc, C.paperDeep)
  roundedRect(doc, boxX + 0.7, y + 0.7, boxW, boxH, 3.5, 'F')
  setFill(doc, C.card)
  setStroke(doc, C.line)
  doc.setLineWidth(0.3)
  roundedRect(doc, boxX, y, boxW, boxH, 3.5, 'FD')

  const maxAbs = Math.max(
    ...parts.map((p) => Math.abs(p.value)),
    Math.abs(
      parts.reduce((acc, p) => {
        if (p.kind === 'in') return acc + p.value
        if (p.kind === 'out') return acc - p.value
        return acc
      }, 0),
    ),
    1,
  )

  // reconstruir níveis
  let running = 0
  const levels = parts.map((p) => {
    if (p.kind === 'in') {
      const from = 0
      const to = p.value
      running = to
      return { ...p, from, to }
    }
    if (p.kind === 'out') {
      const from = running
      const to = running - p.value
      running = to
      return { ...p, from, to }
    }
    return { ...p, from: 0, to: p.value }
  })

  const slotW = (boxW - padX * 2) / levels.length
  const scale = chartH / maxAbs

  // linha base
  setStroke(doc, C.line)
  doc.setLineWidth(0.35)
  doc.setLineDashPattern([1.2, 1.2], 0)
  doc.line(boxX + padX, baseY, boxX + boxW - padX, baseY)
  doc.setLineDashPattern([], 0)

  levels.forEach((p, i) => {
    const cx = boxX + padX + slotW * i + slotW / 2
    const barW = Math.min(16, slotW - 12)

    const color =
      p.kind === 'in'
        ? C.accent
        : p.kind === 'out'
          ? C.danger
          : p.value >= 0
            ? C.success
            : C.danger

    let barTop: number
    let h: number
    if (p.kind === 'result') {
      h = Math.max(2.2, Math.abs(p.value) * scale)
      barTop = baseY - h
    } else {
      const top = Math.max(p.from, p.to, 0)
      const bot = Math.max(Math.min(p.from, p.to), 0)
      h = Math.max(2.2, (top - bot) * scale || Math.abs(p.value) * scale)
      barTop = baseY - top * scale
      // se o nível ficou negativo, ancora na base
      if (top <= 0) {
        h = Math.max(2.2, Math.abs(p.value) * scale)
        barTop = baseY - h
      }
    }

    // conector do nível acumulado anterior
    if (i > 0 && p.kind === 'out') {
      const prev = levels[i - 1]
      const prevLevel = Math.max(prev.to, 0)
      const yConn = baseY - prevLevel * scale
      setStroke(doc, C.dim)
      doc.setLineWidth(0.35)
      doc.setLineDashPattern([0.8, 0.8], 0)
      doc.line(cx - slotW / 2 + 2, yConn, cx - barW / 2, yConn)
      doc.setLineDashPattern([], 0)
    }

    setFill(doc, color)
    roundedRect(doc, cx - barW / 2, barTop, barW, h, 1.2, 'F')

    setText(doc, C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(p.label, cx, y + 6.5, { align: 'center', maxWidth: slotW - 3 })

    setText(doc, C.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    const sign =
      p.kind === 'out' ? '−' : p.kind === 'result' && p.value > 0 ? '+' : ''
    doc.text(`${sign}${money(Math.abs(p.value))}`, cx, y + 11, {
      align: 'center',
      maxWidth: slotW - 3,
    })
  })

  return y + boxH + 8
}

function drawHBars(
  doc: Doc,
  y: number,
  rows: Array<{ label: string; value: number }>,
  ctx: { periodo: string; secao: string; logos: LogoAssets },
  opts?: { valueColor?: (v: number) => RGB },
) {
  if (!rows.length) {
    setText(doc, C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Sem dados neste período.', MARGIN, y)
    return y + 10
  }

  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  const labelW = 46
  const valueW = 34
  const barX = MARGIN + labelW
  const barW = contentW(doc) - labelW - valueW - 2
  let yy = y

  for (const row of rows) {
    yy = ensureSpace(doc, yy, 11, ctx)

    setText(doc, C.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(truncate(doc, row.label, labelW - 3), MARGIN, yy + 4)

    setFill(doc, C.accentSoft)
    roundedRect(doc, barX, yy, barW, 5.5, 1.4, 'F')
    const fillW = Math.max(2, (Math.abs(row.value) / max) * barW)
    const fillColor =
      opts?.valueColor?.(row.value) ?? (row.value >= 0 ? C.accent : C.danger)
    setFill(doc, fillColor)
    roundedRect(doc, barX, yy, fillW, 5.5, 1.4, 'F')

    setText(doc, row.value >= 0 ? C.ink : C.danger)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(money(row.value), pageW(doc) - MARGIN, yy + 4, { align: 'right' })
    yy += 10
  }
  return yy + 3
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
  const gap = 4
  const cardW = (contentW(doc) - gap) / 2
  const cardH = 54

  const paint = (x: number, data: typeof left) => {
    setFill(doc, C.paperDeep)
    roundedRect(doc, x + 0.6, y + 0.7, cardW, cardH, 3.5, 'F')
    setFill(doc, C.card)
    setStroke(doc, C.line)
    doc.setLineWidth(0.3)
    roundedRect(doc, x, y, cardW, cardH, 3.5, 'FD')

    setFill(doc, data.ok ? C.success : C.danger)
    roundedRect(doc, x, y, cardW, 2, 1, 'F')

    setText(doc, C.muted)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(data.title.toUpperCase(), x + 5, y + 9)

    setText(doc, data.ok ? C.success : C.danger)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(data.status, x + 5, y + 16.5)

    let yy = y + 24
    data.rows.forEach((r, idx) => {
      if (idx > 0) {
        setStroke(doc, C.line)
        doc.setLineWidth(0.2)
        doc.line(x + 5, yy - 3.2, x + cardW - 5, yy - 3.2)
      }
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

  paint(MARGIN, left)
  paint(MARGIN + cardW + gap, right)
  return y + cardH + 7
}

function drawProgressRow(
  doc: Doc,
  y: number,
  label: string,
  atual: number,
  meta: number | null,
  hint: string,
) {
  const w = contentW(doc)
  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(label, MARGIN, y)
  setText(doc, C.dim)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(hint, pageW(doc) - MARGIN, y, { align: 'right' })

  const barY = y + 3.5
  setFill(doc, C.accentSoft)
  roundedRect(doc, MARGIN, barY, w, 7, 2, 'F')

  if (meta != null && meta > 0) {
    const ratio = Math.min(1, Math.max(0, atual / meta))
    setFill(doc, ratio >= 1 ? C.success : C.accent)
    roundedRect(doc, MARGIN, barY, Math.max(3, w * ratio), 7, 2, 'F')

    // badge %
    const badge = pct(ratio * 100)
    setText(doc, C.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(
      `${money(atual)}  ·  meta ${money(meta)}  ·  ${badge}`,
      MARGIN,
      barY + 13,
    )
  } else {
    setText(doc, C.muted)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${money(atual)} · meta indisponível neste mês`, MARGIN, barY + 13)
  }
  return barY + 18
}

function drawInsightBox(
  doc: Doc,
  y: number,
  title: string,
  bullets: string[],
) {
  const w = contentW(doc)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  const wrapped = bullets.map((b) => doc.splitTextToSize(b, w - 18))
  const bodyH = wrapped.reduce((acc, lines) => acc + lines.length * 3.6 + 2.2, 0)
  const h = 10 + bodyH + 4

  setFill(doc, C.accentSoft)
  roundedRect(doc, MARGIN, y, w, h, 3.5, 'F')
  setFill(doc, C.accent)
  roundedRect(doc, MARGIN, y, 2.2, h, 1, 'F')

  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(title, MARGIN + 8, y + 7)

  let yy = y + 12
  wrapped.forEach((lines) => {
    setFill(doc, C.accentDeep)
    doc.circle(MARGIN + 10, yy + 1, 1.1, 'F')
    setText(doc, C.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.text(lines, MARGIN + 14, yy + 2)
    yy += lines.length * 3.6 + 2.2
  })

  return y + h + 6
}

function drawChecklistBox(doc: Doc, y: number, title: string, items: string[]) {
  const w = contentW(doc)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.6)
  const wrapped = items.map((line) => doc.splitTextToSize(line, w - 20))
  const bodyH = wrapped.reduce((acc, lines) => acc + lines.length * 3.5 + 3, 0)
  const h = 12 + bodyH + 3

  setFill(doc, C.paperDeep)
  roundedRect(doc, MARGIN + 0.6, y + 0.7, w, h, 3.5, 'F')
  setFill(doc, C.card)
  setStroke(doc, C.line)
  doc.setLineWidth(0.3)
  roundedRect(doc, MARGIN, y, w, h, 3.5, 'FD')

  setText(doc, C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(title, MARGIN + 6, y + 8)

  let yy = y + 14
  wrapped.forEach((lines, i) => {
    // checkbox
    setStroke(doc, C.accent)
    doc.setLineWidth(0.45)
    doc.roundedRect(MARGIN + 6, yy - 1.8, 3.2, 3.2, 0.5, 0.5, 'S')
    setText(doc, C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.6)
    doc.text(lines, MARGIN + 12, yy + 0.8)
    yy += lines.length * 3.5 + 3
    if (i < wrapped.length - 1) {
      // espaçamento já incluso
    }
  })

  return y + h + 4
}

function drawHighlightPair(
  doc: Doc,
  y: number,
  left?: { title: string; name: string; value: string } | null,
  right?: { title: string; name: string; value: string } | null,
) {
  if (!left && !right) return y
  const gap = 4
  const half = (contentW(doc) - gap) / 2

  const paint = (
    x: number,
    data: { title: string; name: string; value: string },
    ok: boolean,
  ) => {
    setFill(doc, ok ? C.successSoft : C.dangerSoft)
    roundedRect(doc, x, y, half, 22, 3, 'F')
    setFill(doc, ok ? C.success : C.danger)
    roundedRect(doc, x, y, 2, 22, 1, 'F')

    setText(doc, ok ? C.success : C.danger)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(data.title.toUpperCase(), x + 6, y + 6.5)

    setText(doc, C.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(truncate(doc, data.name, half - 12), x + 6, y + 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setText(doc, C.muted)
    doc.text(data.value, x + 6, y + 18.5)
  }

  if (left) paint(MARGIN, left, true)
  if (right) paint(MARGIN + half + gap, right, false)
  return y + 28
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
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H + 2 },
    styles: {
      font: 'helvetica',
      fontSize: 7.4,
      cellPadding: { top: 2.6, right: 2.4, bottom: 2.6, left: 2.4 },
      textColor: C.ink as unknown as number[],
      lineColor: C.line as unknown as number[],
      lineWidth: 0.15,
      overflow: 'linebreak',
      valign: 'middle',
      fillColor: C.card as unknown as number[],
    },
    headStyles: {
      fillColor: C.ink as unknown as number[],
      textColor: C.white as unknown as number[],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 3, right: 2.4, bottom: 3, left: 2.4 },
    },
    alternateRowStyles: {
      fillColor: [250, 246, 240] as unknown as number[],
    },
    tableLineColor: C.line as unknown as number[],
    tableLineWidth: 0.15,
  })
  return (doc.lastAutoTable?.finalY ?? startY) + 2
}

/**
 * Relatório executivo do mês — gestão à vista para dono de vidraçaria.
 */
export async function gerarRelatorioPdf(
  painel: PainelSocios,
  options: PdfReportOptions = {},
) {
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
  const empresaNome =
    options.empresaNome?.trim() || 'Sua vidraçaria'
  const geradoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const logos = await loadLogoAssets()

  const ctxP1 = { periodo, secao: 'Gestão à vista', logos }
  const ctxP2 = { periodo, secao: 'Mix & rentabilidade', logos }
  const ctxP3 = { periodo, secao: 'Caixa & compromissos', logos }

  // —— Página 1 ——
  paintPageBackground(doc)
  let y = drawCoverHeader(doc, {
    empresaNome,
    periodo,
    geradoEm,
    logos,
  })

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
    { label: 'Faturamento', value: money(resultado.faturamento) },
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

  y = ensureSpace(doc, y, 70, ctxP1)
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

  const leitura =
    visaoMes?.leitura ||
    'DRE = o que foi vendido no mês. Caixa = o que entrou/saiu de dinheiro — pode ser de vendas de outros meses.'
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  setText(doc, C.muted)
  const leituraLines = doc.splitTextToSize(leitura, contentW(doc))
  y = ensureSpace(doc, y, leituraLines.length * 3.4 + 6, ctxP1)
  doc.text(leituraLines, MARGIN, y)
  y += leituraLines.length * 3.4 + 7

  y = ensureSpace(doc, y, 42, ctxP1)
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

  const topLinha = [...(rentabilidade.porLinha ?? [])].sort(
    (a, b) => b.lucro - a.lucro,
  )[0]
  const piorProduto = rentabilidade.menosRentavel
  const receberAberto = contasAReceber?.totalEmAberto ?? 0
  const bullets = [
    topLinha
      ? `Linha que mais lucrou: ${topLinha.linha} (${money(topLinha.lucro)}) — priorize esse mix.`
      : 'Ainda sem linhas com lucro no período — lance vendas com custos atrelados.',
    piorProduto
      ? `Atenção: ${piorProduto.produto} com lucro ${money(piorProduto.lucro)} — revise preço ou desperdício.`
      : 'Sem alerta de produto fraco neste recorte.',
    receberAberto > 0
      ? `Contas a receber em aberto: ${money(receberAberto)} — cobre clientes com vencimento próximo.`
      : 'Nenhuma conta a receber em aberto neste mês.',
  ]

  y = ensureSpace(doc, y, 36, ctxP1)
  y = drawInsightBox(doc, y, 'O que olhar amanhã na oficina', bullets)

  // —— Página 2: Mix ——
  doc.addPage()
  paintPageBackground(doc)
  y = drawContinuityHeader(doc, periodo, 'Mix & rentabilidade', logos)

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
  y = drawHBars(doc, y, linhas, ctxP2, {
    valueColor: (v) => (v >= 0 ? C.success : C.danger),
  })

  y = ensureSpace(doc, y, 28, ctxP2)
  y = drawSectionTitle(doc, y, 'Top produtos', 'Receita, custo e lucro')
  const produtos = [...rentabilidade.porProduto]
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 12)
  if (!produtos.length) {
    setText(doc, C.muted)
    doc.setFontSize(8)
    doc.text('Nenhum produto com movimento neste mês.', MARGIN, y)
    y += 10
  } else {
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
    y += 6
  }

  if (rentabilidade.porCliente?.length) {
    y = ensureSpace(doc, y, 28, ctxP2)
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

  y = ensureSpace(doc, y, 30, ctxP2)
  y = drawHighlightPair(
    doc,
    y,
    rentabilidade.maisRentavel
      ? {
          title: 'Mais rentável',
          name: rentabilidade.maisRentavel.produto,
          value: money(rentabilidade.maisRentavel.lucro),
        }
      : null,
    rentabilidade.menosRentavel
      ? {
          title: 'Menos rentável',
          name: rentabilidade.menosRentavel.produto,
          value: money(rentabilidade.menosRentavel.lucro),
        }
      : null,
  )

  // —— Página 3: Caixa ——
  doc.addPage()
  paintPageBackground(doc)
  y = drawContinuityHeader(doc, periodo, 'Caixa & compromissos', logos)

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
    doc.text('Nenhuma entrada prevista neste mês.', MARGIN, y)
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
    y += 6
  }

  y = ensureSpace(doc, y, 28, ctxP3)
  y = drawSectionTitle(
    doc,
    y,
    'Custos fixos',
    'O que pesa todo mês na vidraçaria',
  )
  const fixos = (
    custosFixos.vigentes?.length
      ? custosFixos.vigentes.map((v) => ({
          nome: v.descricao,
          venc: '—',
          valor: v.valorMensal,
          status: 'Vigente',
        }))
      : custosFixos.itens.map((i) => ({
          nome:
            [i.categoria, i.subcategoria].filter(Boolean).join(' / ') || 'Custo',
          venc: i.dataVencimento?.split('-').reverse().join('/') ?? '—',
          valor: i.valorPrevisto,
          status: i.status,
        }))
  ).slice(0, 14)

  if (!fixos.length) {
    setText(doc, C.muted)
    doc.setFontSize(8)
    doc.text('Nenhum custo fixo cadastrado para o período.', MARGIN, y)
    y += 10
  } else {
    y = styledTable(
      doc,
      autoTable,
      y,
      ['Descrição', 'Vencimento', 'Valor', 'Status'],
      fixos.map((f) => [f.nome, f.venc, money(f.valor), f.status]),
    )
    y += 6
  }

  const checklist = [
    `Conferir contas a receber em aberto (${money(contasAReceber?.totalEmAberto ?? 0)}) e marcar Recebido quando o cliente pagar.`,
    `Validar se o faturamento cobre os fixos: ${projecao.cobreCustosFixos ? 'sim' : 'ainda não'} (sobra/falta ${money(projecao.sobraOuFalta)}).`,
    'Empurrar a linha/produto mais rentável e revisar o item com pior lucro antes de fechar orçamentos.',
    `Meta confortável: ${projecao.metaConfortavelFaturamento == null ? '—' : money(projecao.metaConfortavelFaturamento)} · equilíbrio: ${projecao.pontoEquilibrioFaturamento == null ? '—' : money(projecao.pontoEquilibrioFaturamento)}.`,
  ]

  y = ensureSpace(doc, y, 48, ctxP3)
  y = drawChecklistBox(
    doc,
    y,
    'Fechamento do mês — checklist do dono',
    checklist,
  )

  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i)
    drawFooter(doc, i, total, logos)
  }

  doc.save(`glazia-relatorio-${painel.mes}.pdf`)
}
