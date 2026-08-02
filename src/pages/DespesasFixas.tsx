import {
  History,
  Infinity as InfinityIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIAS_CUSTO_FIXO } from '../data/categoriasCustoFixo'
import {
  atualizarDespesaFixa,
  criarDespesaFixa,
  historicoPagamentosDespesa,
  listarDespesasFixas,
  marcarDespesaPaga,
  removerDespesaFixa,
} from '../services/api'
import type { DespesaFixaCadastro, HistoricoPagamentoItem } from '../types'
import { formatCurrency } from '../utils/format'

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

type FormState = {
  descricao: string
  categoriaId: string
  valorMensal: string
  diaVencimento: string
  dataInicio: string
  semTermino: boolean
  dataFim: string
  observacao: string
}

function emptyForm(): FormState {
  return {
    descricao: '',
    categoriaId: CATEGORIAS_CUSTO_FIXO[0]?.id ?? 'outros',
    valorMensal: '',
    diaVencimento: '10',
    dataInicio: todayInput(),
    semTermino: true,
    dataFim: '',
    observacao: '',
  }
}

function formFromItem(item: DespesaFixaCadastro): FormState {
  return {
    descricao: item.descricao,
    categoriaId: item.categoriaId,
    valorMensal: String(item.valorMensal).replace('.', ','),
    diaVencimento: String(item.diaVencimento),
    dataInicio: item.dataInicio,
    semTermino: item.semTermino,
    dataFim: item.dataFim ?? '',
    observacao: item.observacao ?? '',
  }
}

function parseMoney(raw: string) {
  return Number(raw.replace(/\./g, '').replace(',', '.'))
}

export function DespesasFixas() {
  const { usuario } = useApp()
  const podePagar = usuario?.cargo === 'DIRETOR'

  const [itens, setItens] = useState<DespesaFixaCadastro[]>([])
  const [totalMensal, setTotalMensal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<DespesaFixaCadastro | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  const [confirmPago, setConfirmPago] = useState<DespesaFixaCadastro | null>(
    null,
  )
  const [marcandoPago, setMarcandoPago] = useState(false)
  const [histOpen, setHistOpen] = useState<DespesaFixaCadastro | null>(null)
  const [histItens, setHistItens] = useState<HistoricoPagamentoItem[]>([])
  const [histLoading, setHistLoading] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const res = await listarDespesasFixas()
      setItens(res.itens)
      setTotalMensal(res.totalMensal)
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar os custos fixos',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const maxValor = useMemo(
    () => Math.max(...itens.map((i) => i.valorMensal), 0),
    [itens],
  )

  const abrirNovo = () => {
    setEditing(null)
    setForm(emptyForm())
    setErro(null)
    setOk(null)
    setPanelOpen(true)
  }

  const abrirEdicao = (item: DespesaFixaCadastro) => {
    setEditing(item)
    setForm(formFromItem(item))
    setErro(null)
    setOk(null)
    setPanelOpen(true)
  }

  const fecharPainel = () => {
    if (salvando) return
    setPanelOpen(false)
    setEditing(null)
  }

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    setOk(null)

    const valor = parseMoney(form.valorMensal)
    const dia = Number(form.diaVencimento)
    if (!(valor > 0)) {
      setErro('Informe um valor mensal válido')
      return
    }
    if (!(dia >= 1 && dia <= 28)) {
      setErro('Dia de vencimento deve ser entre 1 e 28')
      return
    }
    if (!form.semTermino && !form.dataFim) {
      setErro('Informe a data de término ou marque “Sem data de término”')
      return
    }

    setSalvando(true)
    try {
      if (editing) {
        const res = await atualizarDespesaFixa(editing.id, {
          descricao: form.descricao.trim(),
          categoriaId: form.categoriaId,
          valorMensal: valor,
          diaVencimento: dia,
          dataInicio: form.dataInicio,
          semTermino: form.semTermino,
          dataFim: form.semTermino ? null : form.dataFim,
          observacao: form.observacao.trim() || null,
        })
        setOk(res.mensagem)
      } else {
        const res = await criarDespesaFixa({
          descricao: form.descricao.trim(),
          categoriaId: form.categoriaId,
          valorMensal: valor,
          diaVencimento: dia,
          dataInicio: form.dataInicio,
          semTermino: form.semTermino,
          dataFim: form.semTermino ? undefined : form.dataFim,
          observacao: form.observacao.trim() || undefined,
        })
        setOk(res.mensagem)
      }
      setPanelOpen(false)
      setEditing(null)
      await carregar()
    } catch (cause) {
      setErro(
        cause instanceof Error ? cause.message : 'Falha ao salvar custo fixo',
      )
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (item: DespesaFixaCadastro) => {
    if (
      !window.confirm(
        `Remover “${item.descricao}”? As previsões futuras no fluxo serão canceladas.`,
      )
    ) {
      return
    }
    setRemovendoId(item.id)
    setErro(null)
    try {
      const res = await removerDespesaFixa(item.id)
      setOk(res.mensagem)
      await carregar()
    } catch (cause) {
      setErro(
        cause instanceof Error ? cause.message : 'Falha ao remover custo fixo',
      )
    } finally {
      setRemovendoId(null)
    }
  }

  const abrirHistorico = async (item: DespesaFixaCadastro) => {
    setHistOpen(item)
    setHistLoading(true)
    setHistItens([])
    try {
      const res = await historicoPagamentosDespesa(item.id)
      setHistItens(res.itens)
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar o histórico',
      )
      setHistOpen(null)
    } finally {
      setHistLoading(false)
    }
  }

  const confirmarMarcarPago = async () => {
    if (!confirmPago) return
    setMarcandoPago(true)
    setErro(null)
    try {
      const idTransacao = confirmPago.proximaParcela?.idTransacao
      const res = await marcarDespesaPaga(confirmPago.id, idTransacao)
      setOk(res.mensagem)
      setConfirmPago(null)
      await carregar()
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível marcar como pago',
      )
    } finally {
      setMarcandoPago(false)
    }
  }

  return (
    <div className="df-page" data-tour="despesas-intro">
      <header className="df-intro fade-up">
        <div>
          <p className="section-title" style={{ marginBottom: '0.35rem' }}>
            Estrutura recorrente
          </p>
          <h2 className="lanc-title">Custos fixos</h2>
          <p className="lanc-subtitle">
            Cadastre parcelas com vigência ou custos sem término. Eles alimentam
            o fluxo de caixa e o resultado do mês na Análise.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-accent"
          data-tour="despesas-novo"
          onClick={abrirNovo}
        >
          <Plus size={16} /> Novo custo fixo
        </button>
      </header>

      <section className="df-summary glass fade-up" data-tour="despesas-resumo">
        <div>
          <span className="df-summary-label">Total mensal vigente</span>
          <strong className="df-summary-value">
            {formatCurrency(totalMensal)}
          </strong>
        </div>
        <div>
          <span className="df-summary-label">Itens ativos</span>
          <strong className="df-summary-value sm">{itens.length}</strong>
        </div>
        <div>
          <span className="df-summary-label">Maior custo</span>
          <strong className="df-summary-value sm">
            {itens[0] ? itens[0].descricao : '—'}
          </strong>
        </div>
      </section>

      {erro && !panelOpen && <p className="lanc-error fade-up">{erro}</p>}
      {ok && !panelOpen && (
        <p className="conta-ok fade-up" role="status">
          {ok}
        </p>
      )}

      {loading ? (
        <div className="glass df-loading fade-up">
          <Loader2 className="spin" size={18} /> Carregando custos fixos…
        </div>
      ) : itens.length === 0 ? (
        <div className="glass df-empty fade-up" data-tour="despesas-ranking">
          <p>Nenhum custo fixo cadastrado ainda.</p>
          <button type="button" className="btn btn-accent" onClick={abrirNovo}>
            <Plus size={16} /> Cadastrar o primeiro
          </button>
        </div>
      ) : (
        <>
          <section
            className="df-ranking glass fade-up"
            data-tour="despesas-ranking"
          >
            <div className="df-ranking-head">
              <h3>Onde está o dinheiro</h3>
              <p>
                Barras proporcionais ao valor mensal — o maior custo aparece em
                destaque.
              </p>
            </div>
            <ul className="df-bars">
              {itens.map((item, index) => {
                const pct =
                  maxValor > 0 ? (item.valorMensal / maxValor) * 100 : 0
                return (
                  <li key={item.id} className={index === 0 ? 'top' : undefined}>
                    <div className="df-bar-meta">
                      <span className="df-bar-rank">{index + 1}</span>
                      <div className="df-bar-copy">
                        <strong>{item.descricao}</strong>
                        <span>{item.categoriaLabel}</span>
                      </div>
                      <strong className="df-bar-valor">
                        {formatCurrency(item.valorMensal)}
                      </strong>
                    </div>
                    <div className="df-bar-track" aria-hidden="true">
                      <div
                        className="df-bar-fill"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="df-list fade-up">
            <h3 className="df-list-title">Detalhes e vigência</h3>
            <div className="df-cards">
              {itens.map((item) => {
                const temParcelaAberta = Boolean(item.proximaParcela)
                const pagoMes = Boolean(item.parcelaMesAtualPaga)
                const pagoHoje = Boolean(item.pagoHoje)
                return (
                <article key={item.id} className="df-card glass">
                  <div className="df-card-top">
                    <div>
                      <strong>{item.descricao}</strong>
                      <p>{item.categoriaLabel}</p>
                    </div>
                    <div className="df-card-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Histórico de pagamentos"
                        title="Histórico de pagamentos"
                        onClick={() => void abrirHistorico(item)}
                      >
                        <History size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Editar"
                        title="Editar"
                        onClick={() => abrirEdicao(item)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Remover"
                        title="Remover"
                        disabled={removendoId === item.id}
                        onClick={() => void excluir(item)}
                      >
                        {removendoId === item.id ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="df-card-valor">
                    {formatCurrency(item.valorMensal)}
                    <span>/ mês · dia {item.diaVencimento}</span>
                  </div>
                  <div className="df-card-vigencia">
                    {item.semTermino ? (
                      <span className="df-chip forever">
                        <InfinityIcon size={13} /> Sem data de término
                      </span>
                    ) : (
                      <span className="df-chip">
                        Até {item.dataFim?.split('-').reverse().join('/')}
                      </span>
                    )}
                    <span className="df-chip muted">
                      Desde {item.dataInicio.split('-').reverse().join('/')}
                    </span>
                    {item.ultimoPagamento && (
                      <span className="df-chip paid">
                        Último pagamento{' '}
                        {item.ultimoPagamento.split('-').reverse().join('/')}
                      </span>
                    )}
                  </div>

                  {podePagar && (
                    <div className="df-pay-row">
                      <div>
                        <strong>
                          {pagoMes
                            ? 'Parcela do mês paga'
                            : pagoHoje
                              ? `Registrado hoje · próxima ${item.proximaParcela?.dataVencimento?.split('-').reverse().join('/') ?? '—'}`
                              : temParcelaAberta
                                ? `Próximo vencimento ${item.proximaParcela?.dataVencimento?.split('-').reverse().join('/')}`
                                : 'Sem parcela em aberto'}
                        </strong>
                        <p>
                          {(item.qtdPagamentos ?? 0) > 0
                            ? `${item.qtdPagamentos} pagamento(s) no histórico`
                            : 'Ainda sem pagamentos registrados'}
                        </p>
                      </div>
                      <label
                        className={`df-switch${pagoMes || !temParcelaAberta ? ' disabled' : ''}`}
                        title={
                          pagoMes
                            ? 'Já quitada neste mês'
                            : temParcelaAberta
                              ? 'Marcar como pago'
                              : 'Nada a pagar'
                        }
                      >
                        <span>Pago</span>
                        <input
                          type="checkbox"
                          checked={pagoMes}
                          disabled={pagoMes || !temParcelaAberta}
                          onChange={() => {
                            if (!pagoMes && temParcelaAberta) {
                              setConfirmPago(item)
                            }
                          }}
                        />
                        <span className="df-switch-track" aria-hidden="true" />
                      </label>
                    </div>
                  )}
                </article>
                )
              })}
            </div>
          </section>
        </>
      )}

      {panelOpen && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-drawer glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="df-drawer-title"
          >
            <header className="df-drawer-head">
              <div>
                <h3 id="df-drawer-title">
                  {editing ? 'Editar custo fixo' : 'Novo custo fixo'}
                </h3>
                <p>
                  Nome livre + categoria. A vigência define até quando entra no
                  fluxo de caixa.
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={fecharPainel}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            <form className="df-form" onSubmit={(e) => void salvar(e)}>
              <div className="field">
                <label htmlFor="df-nome">Nome do custo</label>
                <input
                  id="df-nome"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descricao: e.target.value }))
                  }
                  placeholder="Ex.: Aluguel do galpão"
                  required
                  maxLength={120}
                />
              </div>

              <div className="field">
                <label htmlFor="df-cat">Categoria</label>
                <select
                  id="df-cat"
                  value={form.categoriaId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoriaId: e.target.value }))
                  }
                  required
                >
                  {CATEGORIAS_CUSTO_FIXO.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="df-form-row">
                <div className="field">
                  <label htmlFor="df-valor">Valor mensal (R$)</label>
                  <input
                    id="df-valor"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.valorMensal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valorMensal: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="df-dia">Dia do vencimento</label>
                  <input
                    id="df-dia"
                    type="number"
                    min={1}
                    max={28}
                    value={form.diaVencimento}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, diaVencimento: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="df-form-row">
                <div className="field">
                  <label htmlFor="df-inicio">Início da vigência</label>
                  <input
                    id="df-inicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dataInicio: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="df-fim">Término</label>
                  <input
                    id="df-fim"
                    type="date"
                    value={form.dataFim}
                    disabled={form.semTermino}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dataFim: e.target.value }))
                    }
                    required={!form.semTermino}
                  />
                </div>
              </div>

              <label className="lanc-check">
                <input
                  type="checkbox"
                  checked={form.semTermino}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      semTermino: e.target.checked,
                      dataFim: e.target.checked ? '' : f.dataFim,
                    }))
                  }
                />
                Sem data de término (custo contínuo)
              </label>

              <div className="field">
                <label htmlFor="df-obs">Observação (opcional)</label>
                <input
                  id="df-obs"
                  value={form.observacao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observacao: e.target.value }))
                  }
                  placeholder="Contrato, banco, referência…"
                  maxLength={500}
                />
              </div>

              {erro && panelOpen && <p className="lanc-error">{erro}</p>}

              <div className="df-form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={fecharPainel}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="spin" size={16} /> Salvando…
                    </>
                  ) : editing ? (
                    'Salvar alterações'
                  ) : (
                    'Incluir custo fixo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmPago && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-confirm glass"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="df-confirm-title"
          >
            <h3 id="df-confirm-title">Confirmar pagamento</h3>
            <p>
              Tem certeza que deseja sinalizar{' '}
              <strong>{confirmPago.descricao}</strong> como pago?
              {confirmPago.proximaParcela?.dataVencimento && (
                <>
                  {' '}
                  A parcela com vencimento em{' '}
                  <strong>
                    {confirmPago.proximaParcela.dataVencimento
                      .split('-')
                      .reverse()
                      .join('/')}
                  </strong>{' '}
                  ({formatCurrency(confirmPago.valorMensal)}) sai da lista de
                  próximos vencimentos.
                </>
              )}
            </p>
            <div className="df-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={marcandoPago}
                onClick={() => setConfirmPago(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={marcandoPago}
                onClick={() => void confirmarMarcarPago()}
              >
                {marcandoPago ? (
                  <>
                    <Loader2 className="spin" size={16} /> Confirmando…
                  </>
                ) : (
                  'Sim, marcar como pago'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {histOpen && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-drawer glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="df-hist-title"
          >
            <header className="df-drawer-head">
              <div>
                <h3 id="df-hist-title">Histórico de pagamentos</h3>
                <p>
                  {histOpen.descricao} · cada linha é uma sinalização de
                  quitação.
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setHistOpen(null)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            {histLoading ? (
              <p className="lanc-muted">
                <Loader2 className="spin" size={16} /> Carregando…
              </p>
            ) : histItens.length === 0 ? (
              <p className="lanc-muted">
                Nenhum pagamento registrado para este custo ainda.
              </p>
            ) : (
              <ul className="df-hist-list">
                {histItens.map((h) => (
                  <li key={h.id}>
                    <div>
                      <strong>
                        Pago em {h.dataPagamento.split('-').reverse().join('/')}
                      </strong>
                      <span>
                        Competência{' '}
                        {h.competencia.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <em>{formatCurrency(h.valorPago)}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
