import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MinusCircle,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  calendarioVendasLancamento,
  listarVendasLancamento,
  obterVendaLancamento,
} from '../services/api'
import type { VendaDetalhe, VendaResumo } from '../types'
import { rotuloCoresItem } from '../utils/coresVenda'
import {
  capitalize,
  formatCurrency,
  formatDate,
  formatMonthLabel,
} from '../utils/format'

type VereditoNivel =
  | 'excelente'
  | 'bom'
  | 'apertado'
  | 'limite'
  | 'prejuizo'
  | 'incompleto'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function todayLocal() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function monthFromDate(iso: string) {
  return iso.slice(0, 7)
}

function shiftMonth(mes: string, delta: number) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const count = new Date(y, m, 0).getDate()
  return { pad: first.getDay(), count, year: y, month: m }
}

function formatPercent(value: number) {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function mesPorExtenso(mesKey: string | null | undefined) {
  if (!mesKey) return null
  return capitalize(formatMonthLabel(mesKey))
}

function vereditoMargem(
  margem: number,
  temGastos: boolean,
): { nivel: VereditoNivel; titulo: string; texto: string } {
  if (!temGastos) {
    return {
      nivel: 'incompleto',
      titulo: 'Diagnóstico incompleto',
      texto: 'Sem gastos lançados, a margem parece total. Inclua os custos variáveis para saber se este item de fato valeu a pena.',
    }
  }
  if (margem >= 30) {
    return {
      nivel: 'excelente',
      titulo: 'Valeu a pena',
      texto: 'Margem confortável para vidraçaria. O item cobre os gastos e ainda deixa folga para os custos fixos.',
    }
  }
  if (margem >= 15) {
    return {
      nivel: 'bom',
      titulo: 'Valeu a pena',
      texto: 'A margem é positiva e saudável, com folga moderada. O item se pagou.',
    }
  }
  if (margem >= 5) {
    return {
      nivel: 'apertado',
      titulo: 'Apertado',
      texto: 'Cobre o item, mas deixa pouco para aluguel, equipe e demais custos fixos. Revise preço ou consumo.',
    }
  }
  if (margem > 0) {
    return {
      nivel: 'limite',
      titulo: 'Quase no limite',
      texto: 'A margem é mínima. Qualquer retrabalho ou desperdício transforma o item em prejuízo.',
    }
  }
  return {
    nivel: 'prejuizo',
    titulo: 'Não valeu a pena',
    texto: 'Os gastos superaram o faturamento. Este item gerou prejuízo operacional.',
  }
}

function VereditoIcon({ nivel }: { nivel: VereditoNivel }) {
  if (nivel === 'excelente' || nivel === 'bom') {
    return <CheckCircle2 size={18} />
  }
  if (nivel === 'prejuizo' || nivel === 'limite') {
    return <AlertTriangle size={18} />
  }
  return <MinusCircle size={18} />
}

export function AnaliseVendas() {
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [mes, setMes] = useState(() => monthFromDate(todayLocal()))
  const [dataFiltro, setDataFiltro] = useState<string | null>(null)
  const [diasMap, setDiasMap] = useState<
    Record<string, { quantidade: number; faturamento: number }>
  >({})
  const [vendas, setVendas] = useState<VendaResumo[]>([])
  const [listaLoading, setListaLoading] = useState(true)
  const [calLoading, setCalLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<VendaDetalhe | null>(null)
  const [detalheLoading, setDetalheLoading] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDebounced(busca.trim()), 220)
    return () => window.clearTimeout(t)
  }, [busca])

  useEffect(() => {
    let alive = true
    setCalLoading(true)
    calendarioVendasLancamento(mes)
      .then((res) => {
        if (!alive) return
        const next: Record<string, { quantidade: number; faturamento: number }> =
          {}
        for (const d of res.dias) {
          next[d.data] = {
            quantidade: d.quantidade,
            faturamento: d.faturamento,
          }
        }
        setDiasMap(next)
      })
      .catch((e) => {
        if (alive) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar o calendário')
        }
      })
      .finally(() => {
        if (alive) setCalLoading(false)
      })
    return () => {
      alive = false
    }
  }, [mes])

  useEffect(() => {
    let alive = true
    setListaLoading(true)
    listarVendasLancamento(buscaDebounced, {
      data: dataFiltro ?? undefined,
    })
      .then((res) => {
        if (!alive) return
        setVendas(res.itens)
        setErro(null)
      })
      .catch((e) => {
        if (alive) {
          setErro(e instanceof Error ? e.message : 'Falha ao listar vendas')
        }
      })
      .finally(() => {
        if (alive) setListaLoading(false)
      })
    return () => {
      alive = false
    }
  }, [buscaDebounced, dataFiltro])

  useEffect(() => {
    if (!selecionadaId) {
      setDetalhe(null)
      return
    }
    let alive = true
    setDetalheLoading(true)
    obterVendaLancamento(selecionadaId)
      .then((res) => {
        if (alive) setDetalhe(res)
      })
      .catch((e) => {
        if (alive) {
          setErro(e instanceof Error ? e.message : 'Falha ao abrir a venda')
          setDetalhe(null)
        }
      })
      .finally(() => {
        if (alive) setDetalheLoading(false)
      })
    return () => {
      alive = false
    }
  }, [selecionadaId])

  const { pad, count } = useMemo(() => daysInMonth(mes), [mes])
  const hoje = todayLocal()

  const escolherDia = (iso: string) => {
    setDataFiltro(iso)
    setSelecionadaId(null)
    setDetalhe(null)
  }

  useEffect(() => {
    if (!dataFiltro || listaLoading) return
    if (vendas.length === 1) setSelecionadaId(vendas[0].idVenda)
  }, [dataFiltro, listaLoading, vendas])

  const limparDia = () => {
    setDataFiltro(null)
  }

  const listaTitulo = useMemo(() => {
    if (dataFiltro && buscaDebounced) {
      return `Vendas de ${formatDate(dataFiltro)} · “${buscaDebounced}”`
    }
    if (dataFiltro) {
      return `Vendas de ${formatDate(dataFiltro)}`
    }
    if (buscaDebounced) {
      return `Resultados para “${buscaDebounced}”`
    }
    return 'Vendas recentes'
  }, [dataFiltro, buscaDebounced])

  const totais = detalhe?.totais
  const vereditoGeral = totais
    ? vereditoMargem(totais.margemPercentual, totais.temGastosLancados)
    : null

  return (
    <div className="av-page fade-up">
      <header className="av-hero">
        <p className="av-kicker">Controle por venda</p>
        <h2 className="lanc-title">Análise de vendas</h2>
        <p className="lanc-subtitle">
          Pesquise pelo cliente, linha ou item — ou escolha o dia no calendário
          para abrir o registro certo e ler a margem de cada peça.
        </p>
      </header>

      <div className="av-search glass">
        <Search size={18} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente, linha, produto ou observação…"
          aria-label="Pesquisar vendas"
        />
        {busca && (
          <button
            type="button"
            className="av-icon-btn"
            onClick={() => setBusca('')}
            aria-label="Limpar pesquisa"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {erro && <p className="av-erro">{erro}</p>}

      <div className="av-workspace">
        <aside className="av-browse">
          <section className="av-cal glass">
            <div className="av-cal-head">
              <button
                type="button"
                className="av-icon-btn"
                onClick={() => setMes((m) => shiftMonth(m, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <strong>{capitalize(formatMonthLabel(mes))}</strong>
                <span>
                  {calLoading
                    ? 'Carregando…'
                    : `${Object.keys(diasMap).length} dia${Object.keys(diasMap).length === 1 ? '' : 's'} com venda`}
                </span>
              </div>
              <button
                type="button"
                className="av-icon-btn"
                onClick={() => setMes((m) => shiftMonth(m, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="av-cal-week">
              {WEEKDAYS.map((d, i) => (
                <span key={`${d}-${i}`}>{d}</span>
              ))}
            </div>
            <div className="av-cal-grid">
              {Array.from({ length: pad }, (_, i) => (
                <span key={`pad-${i}`} className="av-cal-pad" />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const day = i + 1
                const iso = `${mes}-${String(day).padStart(2, '0')}`
                const info = diasMap[iso]
                const selected = dataFiltro === iso
                const isToday = iso === hoje
                return (
                  <button
                    key={iso}
                    type="button"
                    className={[
                      'av-cal-day',
                      info ? 'has-sales' : '',
                      selected ? 'selected' : '',
                      isToday ? 'today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => escolherDia(iso)}
                    title={
                      info
                        ? `${info.quantidade} venda${info.quantidade === 1 ? '' : 's'} · ${formatCurrency(info.faturamento)}`
                        : 'Nenhuma venda neste dia'
                    }
                  >
                    <span>{day}</span>
                    {info && <i aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            <div className="av-cal-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const t = todayLocal()
                  setMes(monthFromDate(t))
                  escolherDia(t)
                }}
              >
                <CalendarDays size={14} /> Hoje
              </button>
              {dataFiltro && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={limparDia}
                >
                  Ver recentes
                </button>
              )}
            </div>
          </section>

          <section className="av-list glass">
            <div className="av-list-head">
              <strong>{listaTitulo}</strong>
              <span>
                {listaLoading
                  ? '…'
                  : `${vendas.length} registro${vendas.length === 1 ? '' : 's'}`}
              </span>
            </div>
            {listaLoading ? (
              <p className="av-muted">
                <Loader2 className="spin" size={16} /> Carregando vendas…
              </p>
            ) : vendas.length === 0 ? (
              <p className="av-muted">
                {dataFiltro
                  ? 'Nenhuma venda registrada neste dia.'
                  : 'Nenhuma venda encontrada. Tente outra busca ou outro dia.'}
              </p>
            ) : (
              <ul>
                {vendas.map((v) => {
                  const active = v.idVenda === selecionadaId
                  return (
                    <li key={v.idVenda}>
                      <button
                        type="button"
                        className={`av-sale${active ? ' active' : ''}`}
                        onClick={() => setSelecionadaId(v.idVenda)}
                      >
                        <div className="av-sale-top">
                          <span>{formatDate(v.dataVenda)}</span>
                          <strong>{formatCurrency(v.valorTotal)}</strong>
                        </div>
                        <div className="av-sale-meta">
                          {v.cliente || 'Cliente não informado'}
                          {v.qtdItens
                            ? ` · ${v.qtdItens} item${v.qtdItens === 1 ? '' : 's'}`
                            : ''}
                        </div>
                        {v.resumo && (
                          <div className="av-sale-resumo">{v.resumo}</div>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </aside>

        <section className="av-detail glass" aria-live="polite">
          {!selecionadaId ? (
            <div className="av-empty">
              <div className="av-empty-mark" aria-hidden="true" />
              <h3>Escolha uma venda</h3>
              <p>
                Use a pesquisa ou o calendário à esquerda. Ao selecionar o
                registro, as métricas de cada item aparecem aqui.
              </p>
            </div>
          ) : detalheLoading || !detalhe ? (
            <p className="av-muted">
              <Loader2 className="spin" size={16} /> Abrindo a venda…
            </p>
          ) : (
            <>
              <div className="av-detail-head">
                <div>
                  <p className="av-kicker">Registro de {formatDate(detalhe.dataVenda)}</p>
                  <h3>{detalhe.cliente || 'Venda sem cliente'}</h3>
                </div>
                <span
                  className={`av-badge ${detalhe.jaRecebido ? 'ok' : detalhe.recebimentoParcial ? 'partial' : 'wait'}`}
                >
                  {detalhe.jaRecebido
                    ? 'Recebido'
                    : detalhe.recebimentoParcial
                      ? 'Parcial'
                      : 'A receber'}
                </span>
              </div>

              {detalhe.observacao && (
                <p className="av-obs">{detalhe.observacao}</p>
              )}

              {totais && (
                <div className="av-kpis">
                  <div>
                    <span>Faturamento</span>
                    <strong>{formatCurrency(totais.faturamento)}</strong>
                  </div>
                  <div>
                    <span>Gastos</span>
                    <strong>{formatCurrency(totais.gastos)}</strong>
                  </div>
                  <div>
                    <span>Lucro</span>
                    <strong
                      className={totais.lucro < 0 ? 'neg' : totais.lucro > 0 ? 'pos' : ''}
                    >
                      {formatCurrency(totais.lucro)}
                    </strong>
                  </div>
                  <div>
                    <span>Margem</span>
                    <strong>{formatPercent(totais.margemPercentual)}</strong>
                  </div>
                </div>
              )}

              {vereditoGeral && (
                <div className={`av-verdict ${vereditoGeral.nivel}`}>
                  <VereditoIcon nivel={vereditoGeral.nivel} />
                  <div>
                    <strong>{vereditoGeral.titulo}</strong>
                    <p>{vereditoGeral.texto}</p>
                  </div>
                </div>
              )}

              <div className="av-items">
                {detalhe.itens.map((item) => {
                  const faturamento =
                    item.faturamento ?? item.quantidade * item.valorUnitario
                  const gastosTotal =
                    item.gastosTotal ??
                    item.gastos.reduce((a, g) => a + g.valor, 0)
                  const lucro = item.lucro ?? faturamento - gastosTotal
                  const margem =
                    item.margemPercentual ??
                    (faturamento > 0 ? (lucro / faturamento) * 100 : 0)
                  const temGastos =
                    item.temGastosLancados ?? item.gastos.length > 0
                  const v = vereditoMargem(margem, temGastos)
                  const barra = Math.max(0, Math.min(100, margem))
                  const nome = rotuloCoresItem(item)
                  return (
                    <article key={item.idVendaItem} className="av-item">
                      <header>
                        <span className="av-linha">{item.linha || 'Linha'}</span>
                        <h4>{nome || 'Item'}</h4>
                      </header>
                      <dl className="av-metrics">
                        <div>
                          <dt>Linha</dt>
                          <dd>{item.linha || '—'}</dd>
                        </div>
                        <div>
                          <dt>Item</dt>
                          <dd>{nome || '—'}</dd>
                        </div>
                        <div>
                          <dt>Quantidade</dt>
                          <dd>
                            {item.quantidade.toLocaleString('pt-BR')}{' '}
                            {item.unidadeVenda}
                          </dd>
                        </div>
                        <div>
                          <dt>Faturamento</dt>
                          <dd>{formatCurrency(faturamento)}</dd>
                        </div>
                        <div>
                          <dt>Lucro</dt>
                          <dd className={lucro < 0 ? 'neg' : lucro > 0 ? 'pos' : ''}>
                            {formatCurrency(lucro)}
                          </dd>
                        </div>
                        <div>
                          <dt>Gastos</dt>
                          <dd>{formatCurrency(gastosTotal)}</dd>
                        </div>
                        <div className="av-metric-wide">
                          <dt>Mês de recebimento</dt>
                          <dd>
                            {detalhe.jaRecebido && detalhe.mesRecebimento
                              ? mesPorExtenso(detalhe.mesRecebimento)
                              : detalhe.recebimentoParcial
                                ? `${formatCurrency(detalhe.valorRecebido ?? 0)} recebido · pendente ${formatCurrency(detalhe.valorPendente ?? 0)}`
                                : 'Ainda não recebido'}
                            {!detalhe.jaRecebido &&
                              detalhe.dataPrevisaoRecebimento && (
                                <small>
                                  {' '}
                                  · previsão{' '}
                                  {mesPorExtenso(
                                    monthFromDate(detalhe.dataPrevisaoRecebimento),
                                  )}
                                </small>
                              )}
                          </dd>
                        </div>
                      </dl>
                      {item.gastos.length > 0 && (
                        <ul className="av-gastos">
                          {item.gastos.map((g, idx) => (
                            <li key={`${item.idVendaItem}-${idx}`}>
                              <span>{g.descricao}</span>
                              <span className="av-gasto-valores">
                                <small>
                                  {(g.quantidade ?? 1).toLocaleString('pt-BR')}{' '}
                                  × {formatCurrency(g.valorUnitario ?? g.valor)}
                                </small>
                                <strong>{formatCurrency(g.valor)}</strong>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="av-margin">
                        <div className="av-margin-label">
                          <span>Margem de lucro</span>
                          <strong>{formatPercent(margem)}</strong>
                        </div>
                        <div className="av-margin-track" aria-hidden="true">
                          <span
                            className={v.nivel}
                            style={{ width: `${barra}%` }}
                          />
                        </div>
                      </div>
                      <div className={`av-verdict compact ${v.nivel}`}>
                        <VereditoIcon nivel={v.nivel} />
                        <div>
                          <strong>{v.titulo}</strong>
                          <p>{v.texto}</p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
