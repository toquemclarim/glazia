import { Check, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ExportButtons } from '../components/ExportButtons'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { marcarContaRecebida, obterPainelSocios } from '../services/api'
import type { ContaAReceberItem, PainelSocios } from '../types'
import {
  capitalize,
  formatCurrency,
  formatMonthLabel,
  textoSemCodigoInterno,
} from '../utils/format'
import { rotuloTipoCor } from '../utils/coresVenda'

const BRONZE = '#c9a06a'
const BRONZE_DEEP = '#8a7355'
const SUCCESS = '#2d9f6f'
const DANGER = '#c45c4a'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

/** 6 meses passados + atual + 6 futuros (ordem cronológica). */
function monthOptions() {
  const base = new Date()
  const meses: string[] = []
  for (let offset = 6; offset >= -6; offset -= 1) {
    const date = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - offset, 1),
    )
    meses.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
    )
  }
  return meses
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--bg-panel-solid)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.65rem 0.85rem',
        fontSize: '0.8rem',
        boxShadow: 'var(--shadow)',
      }}
    >
      {label && <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>}
      {payload.map((item) => (
        <div key={item.name} style={{ color: item.color, marginTop: 2 }}>
          {item.name}: {formatCurrency(item.value)}
        </div>
      ))}
    </div>
  )
}

export function Analise() {
  const { error: authError, usuario } = useApp()
  const { theme } = useTheme()
  const meses = useMemo(() => monthOptions(), [])
  const [mes, setMes] = useState(currentMonth())
  const [painel, setPainel] = useState<PainelSocios | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmReceber, setConfirmReceber] =
    useState<ContaAReceberItem | null>(null)
  const [recebendoId, setRecebendoId] = useState<string | null>(null)

  const podeReceber =
    usuario?.cargo === 'DIRETOR'

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPainel(await obterPainelSocios(mes))
    } catch (cause: unknown) {
      setPainel(null)
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar a análise',
      )
    } finally {
      setLoading(false)
    }
  }, [mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const confirmarRecebimento = async () => {
    if (!confirmReceber) return
    setRecebendoId(confirmReceber.idTransacao)
    try {
      await marcarContaRecebida(confirmReceber.idTransacao)
      setConfirmReceber(null)
      await carregar()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível confirmar o recebimento',
      )
    } finally {
      setRecebendoId(null)
    }
  }

  const gridStroke =
    theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(40,32,24,0.1)'
  const tickFill = theme === 'dark' ? '#b8b0a6' : '#6a6158'

  const resultado = painel?.resultado
  const rentabilidade = painel?.rentabilidade
  const custosFixos = painel?.custosFixos
  const projecao = painel?.projecao
  const visaoMes = painel?.visaoMes
  const fluxoCaixa = painel?.fluxoCaixa
  const contasAReceber = painel?.contasAReceber
  const ehProjecao = Boolean(visaoMes?.ehProjecao)

  const confrontoData = [
    { nome: 'Faturamento', valor: resultado?.faturamento ?? 0, fill: SUCCESS },
    {
      nome: 'Custos variáveis',
      valor: resultado?.custosVariaveis ?? 0,
      fill: DANGER,
    },
    { nome: 'Custos fixos', valor: resultado?.custosFixos ?? 0, fill: BRONZE },
  ]

  return (
    <div>
      <div className="toolbar fade-up">
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            maxWidth: 480,
          }}
        >
          Análise do mês (o que foi vendido) e fluxo de caixa (o que entrou e
          saiu de dinheiro) — são leituras diferentes.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ExportButtons painel={painel} disabled={loading || !painel} />
          <div className="month-select" data-tour="analise-mes">
            <label
              htmlFor="mes"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Mês
            </label>
            <select
              id="mes"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
            >
              {meses.map((item) => {
                const futuro = item > currentMonth()
                return (
                  <option key={item} value={item}>
                    {capitalize(formatMonthLabel(item))}
                    {futuro ? ' · projeção' : item === currentMonth() ? ' · atual' : ''}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      {(error || authError) && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--danger)' }}>
          {error || authError}
        </div>
      )}

      {loading && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem' }}>
          Carregando indicadores…
        </div>
      )}

      {ehProjecao && visaoMes && (
        <section className="analise-projecao glass fade-up">
          <header>
            <p className="section-title" style={{ marginBottom: '0.25rem' }}>
              Projeção
            </p>
            <h2>
              {capitalize(formatMonthLabel(mes))} ainda não aconteceu
            </h2>
            <p>
              Números abaixo são uma projeção com base em contas a receber
              previstas, custos fixos vigentes e a meta de faturamento que a
              empresa precisa bater no mês.
            </p>
          </header>
          <div className="analise-projecao-grid">
            <div>
              <span>Contas a receber</span>
              <strong>{formatCurrency(visaoMes.entradasPrevistas)}</strong>
            </div>
            <div>
              <span>Custos fixos vigentes</span>
              <strong>{formatCurrency(visaoMes.custosFixosVigentes)}</strong>
            </div>
            <div>
              <span>Meta de faturamento</span>
              <strong>
                {visaoMes.metaFaturamento != null
                  ? formatCurrency(visaoMes.metaFaturamento)
                  : '—'}
              </strong>
            </div>
            <div>
              <span>Cobre os fixos?</span>
              <strong className={visaoMes.cobreCustosFixos ? 'ok' : 'warn'}>
                {visaoMes.cobreCustosFixos ? 'Sim' : 'Não'}
                {' · '}
                {formatCurrency(visaoMes.sobraOuFalta)}
              </strong>
            </div>
          </div>
          <p className="analise-projecao-nota">{visaoMes.regraMeta}</p>
        </section>
      )}

      <section className="analise-dupla fade-up fade-up-delay-1">
        <div
          data-tour="analise-veredicto"
          className={`glass analise-bloco ${resultado?.lucrativo ? 'profit' : 'deficit'}`}
        >
          <header>
            <p className="section-title">Análise do mês · DRE</p>
            <h2>
              {ehProjecao
                ? 'Projeção do resultado'
                : resultado?.lucrativo
                  ? 'Mês rentável'
                  : 'Mês não rentável'}
            </h2>
            <p>
              Baseado no que foi <strong>vendido</strong> em{' '}
              {capitalize(formatMonthLabel(mes))} (data da venda). Sem venda no
              mês, o resultado operacional pode ficar negativo — mesmo que o
              caixa esteja positivo.
            </p>
          </header>
          <div className="analise-bloco-valor">
            {resultado && resultado.lucroOperacional > 0 ? '+' : ''}
            {formatCurrency(resultado?.lucroOperacional ?? 0)}
          </div>
          <div className="analise-bloco-grid">
            <div>
              <span>Faturamento</span>
              <strong>{formatCurrency(resultado?.faturamento ?? 0)}</strong>
            </div>
            <div>
              <span>Custos variáveis</span>
              <strong>{formatCurrency(resultado?.custosVariaveis ?? 0)}</strong>
              <small className="analise-cv-split">
                Vendas{' '}
                {formatCurrency(resultado?.custosVariaveisVenda ?? 0)}
                {' · '}
                Estoque{' '}
                {formatCurrency(resultado?.custosVariaveisEstoque ?? 0)}
              </small>
            </div>
            <div>
              <span>Custos fixos</span>
              <strong>{formatCurrency(resultado?.custosFixos ?? 0)}</strong>
            </div>
            <div>
              <span>Meta confortável</span>
              <strong>
                {projecao?.metaConfortavelFaturamento == null
                  ? '—'
                  : formatCurrency(projecao.metaConfortavelFaturamento)}
              </strong>
            </div>
          </div>
          {(resultado?.custosEstoqueMes?.length ?? 0) > 0 && (
            <div className="analise-estoque-list">
              <p className="analise-estoque-title">Estoque no mês</p>
              <ul>
                {resultado!.custosEstoqueMes!.map((c) => (
                  <li key={c.idCusto}>
                    <span>
                      {[c.tipoCusto, c.descricao].filter(Boolean).join(' · ')}
                      <small>
                        {' '}
                        {c.quantidade.toLocaleString('pt-BR')} ×{' '}
                        {formatCurrency(c.valorUnitario)}
                      </small>
                    </span>
                    <strong>{formatCurrency(c.valor)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          data-tour="analise-caixa"
          className={`glass analise-bloco ${
            (fluxoCaixa?.caixaPositivoRealizado ??
            fluxoCaixa?.caixaPositivoPrevisto)
              ? 'profit'
              : 'deficit'
          }`}
        >
          <header>
            <p className="section-title">Fluxo de caixa</p>
            <h2>
              {fluxoCaixa?.caixaPositivoRealizado
                ? 'Caixa no azul'
                : fluxoCaixa?.caixaPositivoPrevisto
                  ? 'Caixa previsto positivo'
                  : 'Caixa apertado'}
            </h2>
            <p>
              Dinheiro que <strong>entra e sai</strong> no mês — inclui
              recebimentos de vendas de meses anteriores. Marcar como Recebido
              nas contas a receber atualiza o caixa realizado.
            </p>
          </header>
          <div className="analise-bloco-valor">
            {(fluxoCaixa?.saldoRealizado ?? 0) > 0 ? '+' : ''}
            {formatCurrency(
              fluxoCaixa?.saldoRealizado ?? fluxoCaixa?.saldoPrevisto ?? 0,
            )}
          </div>
          <div className="analise-bloco-grid">
            <div>
              <span>Entradas previstas</span>
              <strong>
                {formatCurrency(fluxoCaixa?.entradasPrevistas ?? 0)}
              </strong>
            </div>
            <div>
              <span>Entradas recebidas</span>
              <strong className="ok">
                {formatCurrency(fluxoCaixa?.entradasRecebidas ?? 0)}
              </strong>
            </div>
            <div>
              <span>Saídas pagas</span>
              <strong>
                {formatCurrency(fluxoCaixa?.saidasPagas ?? 0)}
              </strong>
            </div>
            <div>
              <span>Saldo previsto</span>
              <strong
                className={
                  (fluxoCaixa?.saldoPrevisto ?? 0) >= 0 ? 'ok' : 'warn'
                }
              >
                {formatCurrency(fluxoCaixa?.saldoPrevisto ?? 0)}
              </strong>
            </div>
          </div>
          {visaoMes?.leitura && (
            <p className="analise-bloco-nota">{visaoMes.leitura}</p>
          )}
        </div>
      </section>

      <section
        className="glass analise-receber fade-up fade-up-delay-2"
        data-tour="analise-contas-receber"
      >
        <div className="panel-header">
          <div>
            <p className="section-title" style={{ marginBottom: '0.2rem' }}>
              Contas a receber
            </p>
            <h2>Entradas do mês no caixa</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Ao marcar Recebido, o valor passa a contar no caixa realizado —
              não altera o faturamento da análise do mês.
            </p>
          </div>
          <div className="analise-receber-totais">
            <div>
              <span>Previsto</span>
              <strong>
                {formatCurrency(contasAReceber?.totalPrevisto ?? 0)}
              </strong>
            </div>
            <div>
              <span>Recebido</span>
              <strong className="ok">
                {formatCurrency(contasAReceber?.totalRecebido ?? 0)}
              </strong>
            </div>
            <div>
              <span>Em aberto</span>
              <strong>
                {formatCurrency(contasAReceber?.totalEmAberto ?? 0)}
              </strong>
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Cliente / descrição</th>
                <th>Valor</th>
                <th>Status</th>
                {podeReceber && <th>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {(contasAReceber?.itens.length ?? 0) === 0 ? (
                <tr>
                  <td
                    colSpan={podeReceber ? 5 : 4}
                    style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Nenhuma entrada prevista neste mês
                  </td>
                </tr>
              ) : (
                contasAReceber?.itens.map((item) => (
                  <tr key={item.idTransacao}>
                    <td>
                      {item.dataVencimento.split('-').reverse().join('/')}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {item.cliente ||
                        textoSemCodigoInterno(item.descricao) ||
                        '—'}
                      {item.dataVenda && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 400,
                            color: 'var(--text-muted)',
                          }}
                        >
                          Venda em{' '}
                          {item.dataVenda.split('-').reverse().join('/')}
                        </div>
                      )}
                    </td>
                    <td>{formatCurrency(item.valorPrevisto)}</td>
                    <td>
                      <span
                        className={`analise-status ${item.recebido ? 'ok' : 'open'}`}
                      >
                        {item.recebido ? 'Recebido' : 'Em aberto'}
                      </span>
                      {item.dataPagamento && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                          }}
                        >
                          {item.dataPagamento.split('-').reverse().join('/')}
                        </div>
                      )}
                    </td>
                    {podeReceber && (
                      <td>
                        {item.recebido ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-accent btn-sm"
                            data-tour="analise-receber-btn"
                            disabled={recebendoId === item.idTransacao}
                            onClick={() => setConfirmReceber(item)}
                          >
                            <Check size={14} /> Recebido
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="stats-row fade-up">
        <div className="glass stat-card">
          <div className="label">Entradas previstas (próximo mês)</div>
          <div className="value">
            {formatCurrency(projecao?.entradasPrevistas ?? 0)}
          </div>
        </div>
        <div className="glass stat-card">
          <div className="label">Cobre custos fixos?</div>
          <div className="value">
            {projecao?.cobreCustosFixos ? 'Sim' : 'Não'}
          </div>
        </div>
        <div className="glass stat-card">
          <div className="label">Ponto de equilíbrio</div>
          <div className="value">
            {projecao?.pontoEquilibrioFaturamento == null
              ? '—'
              : formatCurrency(projecao.pontoEquilibrioFaturamento)}
          </div>
        </div>
        <div className="glass stat-card">
          <div className="label">Produto mais rentável</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {rentabilidade?.maisRentavel?.produto ?? '—'}
          </div>
        </div>
      </div>

      <div className="charts-grid fade-up fade-up-delay-3" data-tour="analise-charts">
        <div className="glass chart-panel">
          <h3>Confronto do mês</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={confrontoData} barSize={42}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="nome"
                tick={{ fill: tickFill, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="valor" name="Valor" radius={[6, 6, 0, 0]}>
                {confrontoData.map((entry) => (
                  <Cell key={entry.nome} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass chart-panel">
          <h3>Lucro por linha</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={rentabilidade?.porLinha ?? []}
              layout="vertical"
              margin={{ left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: tickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="linha"
                width={90}
                tick={{ fill: tickFill, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="lucro"
                name="Lucro"
                fill={BRONZE_DEEP}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass chart-panel">
          <h3>Lucro por produto</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rentabilidade?.porProduto ?? []}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="produto"
                tick={{ fill: tickFill, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="lucro"
                name="Lucro"
                fill={BRONZE}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass chart-panel">
          <h3>Lucro por cliente</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={rentabilidade?.porCliente ?? []}
              layout="vertical"
              margin={{ left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: tickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="cliente"
                width={110}
                tick={{ fill: tickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="lucro"
                name="Lucro"
                fill={SUCCESS}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          {(rentabilidade?.porCliente?.length ?? 0) === 0 && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginTop: '0.5rem',
              }}
            >
              Sem vendas com cliente neste mês.
            </p>
          )}
        </div>

        <div className="glass chart-panel">
          <h3>Custos fixos / vencimentos</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {(custosFixos?.itens.length ?? 0) === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      Nenhuma parcela vence neste mês
                    </td>
                  </tr>
                ) : (
                  custosFixos?.itens.map((item) => (
                    <tr key={`${item.dataVencimento}-${item.categoria}-${item.subcategoria}`}>
                      <td style={{ fontWeight: 600 }}>
                        {item.categoria}
                        {item.subcategoria ? ` / ${item.subcategoria}` : ''}
                      </td>
                      <td>{item.dataVencimento}</td>
                      <td>{formatCurrency(item.valorPrevisto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass" style={{ padding: '1.25rem' }}>
        <div className="panel-header">
          <h2>Cores informadas no mês</h2>
        </div>
        <p className="lanc-muted" style={{ marginTop: 0 }}>
          Só entram itens em que a cor daquele tipo foi preenchida. Não
          informado não aparece no mix.
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Cor</th>
                <th>Itens</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {(rentabilidade?.mixPorSlot?.length ?? 0) === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Sem cores lançadas neste mês
                  </td>
                </tr>
              ) : (
                rentabilidade?.mixPorSlot?.map((item) => (
                  <tr key={`${item.slot}-${item.cor}`}>
                    <td style={{ fontWeight: 600 }}>
                      {rotuloTipoCor(item.slot)}
                    </td>
                    <td>{item.cor}</td>
                    <td>{item.qtdItens}</td>
                    <td style={{ color: 'var(--success)' }}>
                      {formatCurrency(item.receita)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass" style={{ padding: '1.25rem' }}>
        <div className="panel-header">
          <h2>Ranking de rentabilidade por produto</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>Linha</th>
                <th>Receita</th>
                <th>Custo</th>
                <th>Lucro</th>
              </tr>
            </thead>
            <tbody>
              {(rentabilidade?.porProduto.length ?? 0) === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Sem dados de rentabilidade neste mês
                  </td>
                </tr>
              ) : (
                rentabilidade?.porProduto.map((item, index) => (
                  <tr key={item.produto}>
                    <td style={{ color: 'var(--text-dim)' }}>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.produto}</td>
                    <td>{item.linha ?? '—'}</td>
                    <td style={{ color: 'var(--success)' }}>
                      {formatCurrency(item.receita)}
                    </td>
                    <td style={{ color: 'var(--danger)' }}>
                      {formatCurrency(item.custo)}
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color:
                          item.lucro >= 0 ? 'var(--accent)' : 'var(--danger)',
                      }}
                    >
                      {formatCurrency(item.lucro)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmReceber && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-confirm glass"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="analise-receber-title"
          >
            <h3 id="analise-receber-title">Confirmar recebimento</h3>
            <p>
              Tem certeza que deseja marcar{' '}
              <strong>
                {confirmReceber.cliente ||
                  textoSemCodigoInterno(confirmReceber.descricao) ||
                  'esta parcela'}
              </strong>{' '}
              ({formatCurrency(confirmReceber.valorPrevisto)}) como recebido?
              O valor passa a contar no <strong>fluxo de caixa</strong> do mês
              — a análise de rentabilidade (DRE) não muda.
            </p>
            <div className="df-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={Boolean(recebendoId)}
                onClick={() => setConfirmReceber(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={Boolean(recebendoId)}
                onClick={() => void confirmarRecebimento()}
              >
                {recebendoId ? (
                  <>
                    <Loader2 className="spin" size={16} /> Confirmando…
                  </>
                ) : (
                  'Sim, marcar como recebido'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
