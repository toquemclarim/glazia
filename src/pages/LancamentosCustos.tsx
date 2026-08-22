import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ItemPreview } from '../components/ItemPreview'
import { SearchableSelect } from '../components/SearchableSelect'
import {
  atualizarCustoEstoqueLancamento,
  criarCustoLancamento,
  excluirCustoEstoqueLancamento,
  listarCustosCatalogo,
  listarCustosEstoqueLancamento,
  listarLinhasCustoCatalogo,
  listarTiposCustoCatalogo,
  listarVendasLancamento,
  obterCustoEstoqueLancamento,
} from '../services/api'
import type {
  CatalogoCustoItem,
  CustoEstoqueResumo,
  VendaResumo,
} from '../types'

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseDecimal(value: string) {
  return Number(String(value).replace(',', '.'))
}

function totalGastoForm(g: { quantidade: string; valorUnitario: string }) {
  const q = parseDecimal(g.quantidade)
  const u = parseDecimal(g.valorUnitario)
  if (!(q > 0) || Number.isNaN(u) || u < 0) return 0
  return Math.round(q * u * 100) / 100
}

function ordenarTiposCusto(tipos: string[]) {
  const outros = tipos.filter((t) => t.toUpperCase() === 'OUTROS')
  const rest = tipos
    .filter((t) => t.toUpperCase() !== 'OUTROS')
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return [...rest, ...outros]
}

function currentMonthInput() {
  return new Date().toISOString().slice(0, 7)
}

function FormShell({
  title,
  onBack,
  children,
  previews,
}: {
  title: string
  onBack: () => void
  children: ReactNode
  previews: Array<{ key: string; kind: string; label: string }>
}) {
  return (
    <div className="lanc-form-shell glass fade-up cost">
      <div className="lanc-form-layout">
        <div className="lanc-form-main">
          <div className="lanc-wizard-top">
            <button type="button" className="btn-ghost lanc-back" onClick={onBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <h2>{title}</h2>
          </div>
          {children}
        </div>
        <aside className="lanc-preview" aria-hidden="true">
          {previews.length === 0 ? (
            <ItemPreview kind="JANELA" label="Selecione um produto" tone="cost" />
          ) : (
            <div className="lanc-preview-stack">
              {previews.map((p, index) => (
                <ItemPreview
                  key={p.key}
                  kind={p.kind}
                  label={p.label}
                  tone="cost"
                  index={index}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export function GerenciarCustos({
  onBack,
  onEdit,
  onDeleted,
  erro,
  setErro,
}: {
  onBack: () => void
  onEdit: (idCusto: string) => void
  onDeleted: (msg: string) => void
  erro: string | null
  setErro: (v: string | null) => void
}) {
  const [busca, setBusca] = useState('')
  const [mes, setMes] = useState(currentMonthInput())
  const [itens, setItens] = useState<CustoEstoqueResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    let alive = true
    const t = window.setTimeout(() => {
      setLoading(true)
      setErro(null)
      listarCustosEstoqueLancamento({ q: busca, mes })
        .then((res) => {
          if (!alive) return
          setItens(res.itens)
          setErro(null)
        })
        .catch((e) => {
          if (!alive) return
          const raw = e instanceof Error ? e.message : 'Erro ao listar custos'
          setErro(
            /cannot get .*lancamentos\/custos/i.test(raw)
              ? 'API sem a rota de custos. Reinicie o servidor (npm run start:dev) e atualize a página.'
              : raw,
          )
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }, busca ? 250 : 0)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [busca, mes, setErro])

  const alvo = itens.find((c) => c.idCusto === confirmId)

  const confirmarExclusao = async () => {
    if (!confirmId) return
    setExcluindo(true)
    setErro(null)
    try {
      const res = await excluirCustoEstoqueLancamento(confirmId)
      setItens((prev) => prev.filter((c) => c.idCusto !== confirmId))
      setConfirmId(null)
      onDeleted(res.mensagem)
    } catch (cause) {
      setErro(
        cause instanceof Error ? cause.message : 'Falha ao excluir o custo',
      )
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="lanc-form-shell glass fade-up cost">
      <div className="lanc-wizard-top">
        <button type="button" className="btn-ghost lanc-back" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h2>Gerenciar custos</h2>
      </div>

      <div className="lanc-fields-row" style={{ marginBottom: '1rem' }}>
        <div className="field grow">
          <label htmlFor="gerenciar-custo-busca">Pesquisar</label>
          <input
            id="gerenciar-custo-busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Tipo, item, linha…"
          />
        </div>
        <div className="field">
          <label htmlFor="gerenciar-custo-mes">Mês</label>
          <input
            id="gerenciar-custo-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="lanc-muted">
          <Loader2 className="spin" size={16} /> Carregando custos…
        </p>
      ) : itens.length === 0 ? (
        <p className="lanc-muted">Nenhum custo de estoque neste mês.</p>
      ) : (
        <ul className="home-venc-list" style={{ margin: 0 }}>
          {itens.map((c) => (
            <li key={c.idCusto}>
              <div>
                <strong>
                  {c.dataCusto.split('-').reverse().join('/')} · {money(c.valor)}
                </strong>
                <span>
                  {[c.tipoCusto, c.descricao, c.linha]
                    .filter(Boolean)
                    .join(' · ')}
                  {` · ${c.quantidade.toLocaleString('pt-BR')} × ${money(c.valorUnitario)}`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onEdit(c.idCusto)}
                  title="Editar"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmId(c.idCusto)}
                  title="Excluir"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {erro && <p className="lanc-error">{erro}</p>}

      {confirmId && alvo && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-confirm glass"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="lanc-del-custo-title"
          >
            <h3 id="lanc-del-custo-title">Confirmar exclusão</h3>
            <p>
              Tem certeza que deseja excluir o custo{' '}
              <strong>
                {alvo.descricao} · {money(alvo.valor)}
              </strong>
              ? Esta ação remove o lançamento do estoque e da análise.
            </p>
            <div className="df-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={excluindo}
                onClick={() => setConfirmId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={excluindo}
                onClick={() => void confirmarExclusao()}
              >
                {excluindo ? (
                  <>
                    <Loader2 className="spin" size={16} /> Excluindo…
                  </>
                ) : (
                  'Sim, excluir custo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function FormCusto({
  custoId,
  onBack,
  onDone,
  erro,
  setErro,
}: {
  custoId?: string | null
  onBack: () => void
  onDone: (msg: string) => void
  erro: string | null
  setErro: (v: string | null) => void
}) {
  const editando = Boolean(custoId)
  const [tipos, setTipos] = useState<string[]>([])
  const [custos, setCustos] = useState<CatalogoCustoItem[]>([])
  const [vendas, setVendas] = useState<VendaResumo[]>([])
  const [tipo, setTipo] = useState('')
  const [linhaCusto, setLinhaCusto] = useState('')
  const [idCusto, setIdCusto] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [valorUnitario, setValorUnitario] = useState('')
  const [associar, setAssociar] = useState(false)
  const [idVenda, setIdVenda] = useState('')
  const [buscaVenda, setBuscaVenda] = useState('')
  const [itemLivre, setItemLivre] = useState('')
  const [rotuloFixo, setRotuloFixo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [linhasCustoOpts, setLinhasCustoOpts] = useState<string[]>([])

  const isOutros = tipo.toUpperCase() === 'OUTROS'

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await listarTiposCustoCatalogo()
        if (!alive) return
        setTipos(ordenarTiposCusto(res.itens.map((i) => i.tipoCusto)))

        if (!custoId) return
        const det = await obterCustoEstoqueLancamento(custoId)
        if (!alive) return
        setTipo(det.tipoCusto ?? '')
        setLinhaCusto(det.linha ?? '')
        setIdCusto(det.idCustoCatalogo ? String(det.idCustoCatalogo) : '')
        setQuantidade(String(det.quantidade).replace('.', ','))
        setValorUnitario(String(det.valorUnitario).replace('.', ','))
        setRotuloFixo(det.descricao)
        if ((det.tipoCusto ?? '').toUpperCase() === 'OUTROS') {
          setItemLivre(det.descricao)
        }
        setAssociar(false)
      } catch (e) {
        if (alive) {
          setErro(e instanceof Error ? e.message : 'Erro ao carregar o custo')
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [custoId, setErro])

  useEffect(() => {
    if (editando || !tipo) {
      if (!tipo) {
        setCustos([])
        setLinhasCustoOpts([])
      }
      return
    }
    setLinhaCusto('')
    setIdCusto('')
    setItemLivre('')
    setCustos([])
    listarLinhasCustoCatalogo(tipo)
      .then((res) => {
        const linhas = res.itens.map((i) => i.linha)
        setLinhasCustoOpts(linhas)
        if (linhas.length === 0) {
          return listarCustosCatalogo({ tipoCusto: tipo }).then((c) =>
            setCustos(c.itens),
          )
        }
      })
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao carregar linhas'),
      )
  }, [tipo, editando, setErro])

  useEffect(() => {
    if (editando || !isOutros || linhasCustoOpts.length === 0) return
    const geral =
      linhasCustoOpts.find((l) => l.toUpperCase() === 'GERAL') ??
      linhasCustoOpts[0]
    if (linhaCusto !== geral) setLinhaCusto(geral)
  }, [isOutros, linhasCustoOpts, linhaCusto, editando])

  useEffect(() => {
    if (editando) return
    if (!tipo || !linhaCusto) {
      if (!tipo || linhasCustoOpts.length > 0) {
        if (!linhaCusto && linhasCustoOpts.length > 0) setCustos([])
      }
      return
    }
    listarCustosCatalogo({ tipoCusto: tipo, linha: linhaCusto })
      .then((c) => setCustos(c.itens))
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao carregar custos'),
      )
  }, [tipo, linhaCusto, linhasCustoOpts.length, editando, setErro])

  useEffect(() => {
    if (editando || !associar) return
    listarVendasLancamento(buscaVenda)
      .then((res) => setVendas(res.itens))
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao listar vendas'),
      )
  }, [associar, buscaVenda, editando, setErro])

  const escolhido = custos.find((c) => String(c.idCusto) === idCusto)
  const itemCatalogo = isOutros ? custos[0] : escolhido
  const previewList = [
    {
      key: 'custo-preview',
      kind:
        [tipo, isOutros ? itemLivre : itemCatalogo?.descricao || rotuloFixo]
          .filter(Boolean)
          .join(' ') || 'VIDRO',
      label: editando
        ? rotuloFixo || 'Custo de estoque'
        : isOutros
          ? itemLivre.trim() || 'Descreva o custo'
          : itemCatalogo?.rotulo || tipo || 'Selecione um custo',
    },
  ]

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)

    const quantidadeNum = parseDecimal(quantidade)
    const valorUnitarioNum = parseDecimal(valorUnitario)
    const total = totalGastoForm({ quantidade, valorUnitario })
    if (
      !(quantidadeNum > 0) ||
      Number.isNaN(valorUnitarioNum) ||
      valorUnitarioNum < 0 ||
      !(total > 0)
    ) {
      setErro('Informe quantidade e valor unitário válidos')
      return
    }

    if (editando && custoId) {
      setSalvando(true)
      try {
        const res = await atualizarCustoEstoqueLancamento(custoId, {
          quantidade: quantidadeNum,
          valorUnitario: valorUnitarioNum,
          valor: total,
          descricao: isOutros ? itemLivre.trim() || undefined : undefined,
        })
        onDone(res.mensagem)
      } catch (cause) {
        setErro(
          cause instanceof Error ? cause.message : 'Falha ao atualizar custo',
        )
      } finally {
        setSalvando(false)
      }
      return
    }

    if (!itemCatalogo) {
      setErro(isOutros ? 'Selecione o tipo Outros' : 'Selecione o item de custo')
      return
    }
    const descricao = isOutros ? itemLivre.trim() : itemCatalogo.descricao
    if (isOutros && !descricao) {
      setErro('Descreva o item de custo')
      return
    }
    if (associar && !idVenda) {
      setErro('Selecione a venda para associar')
      return
    }

    setSalvando(true)
    try {
      const res = await criarCustoLancamento({
        idCustoCatalogo: itemCatalogo.idCusto,
        descricao,
        tipoCusto: itemCatalogo.tipoCusto || tipo,
        espessura: itemCatalogo.espessura,
        linha: isOutros ? 'GERAL' : itemCatalogo.linha,
        valor: total,
        quantidade: quantidadeNum,
        valorUnitario: valorUnitarioNum,
        associadoAVenda: associar,
        idVenda: associar ? idVenda : undefined,
      })
      onDone(res.mensagem)
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao salvar custo')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <FormShell
      title={editando ? 'Editar custo de estoque' : 'Novo custo'}
      onBack={onBack}
      previews={previewList}
    >
      {loading ? (
        <p className="lanc-muted">
          <Loader2 className="spin" size={16} /> Carregando…
        </p>
      ) : (
        <form className="lanc-form-grid" onSubmit={(e) => void salvar(e)}>
          {editando ? (
            <div className="lanc-fields-row">
              <div className="field grow">
                <label>Item</label>
                <input
                  value={[tipo, linhaCusto, rotuloFixo]
                    .filter(Boolean)
                    .join(' · ')}
                  readOnly
                  className="lanc-computed"
                />
              </div>
              {isOutros && (
                <div className="field grow">
                  <label htmlFor="item-custo-edit">Descrição</label>
                  <input
                    id="item-custo-edit"
                    value={itemLivre}
                    onChange={(e) => setItemLivre(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="lanc-fields-row">
              <div className="field">
                <label htmlFor="tipo-custo">1. Tipo de custo</label>
                <SearchableSelect
                  id="tipo-custo"
                  value={tipo}
                  required
                  placeholder="Busque o tipo…"
                  options={tipos.map((t) => ({ value: t, label: t }))}
                  onChange={setTipo}
                />
              </div>

              {linhasCustoOpts.length > 0 && !isOutros && (
                <div className="field">
                  <label htmlFor="linha-custo">2. Linha</label>
                  <SearchableSelect
                    id="linha-custo"
                    value={linhaCusto}
                    required
                    disabled={!tipo}
                    placeholder={tipo ? 'Busque a linha…' : 'Escolha o tipo'}
                    options={linhasCustoOpts.map((l) => ({
                      value: l,
                      label: l,
                    }))}
                    onChange={(linha) => {
                      setLinhaCusto(linha)
                      setIdCusto('')
                    }}
                  />
                </div>
              )}

              <div className="field grow">
                <label htmlFor="item-custo">
                  {isOutros || linhasCustoOpts.length === 0
                    ? '2. Item'
                    : '3. Item'}
                </label>
                {isOutros ? (
                  <input
                    id="item-custo"
                    value={itemLivre}
                    onChange={(e) => setItemLivre(e.target.value)}
                    placeholder="Digite o item (ex.: café da manhã na obra)"
                    required
                  />
                ) : (
                  <SearchableSelect
                    id="item-custo"
                    value={idCusto}
                    required
                    disabled={
                      !tipo || (linhasCustoOpts.length > 0 && !linhaCusto)
                    }
                    placeholder={
                      !tipo
                        ? 'Escolha o tipo'
                        : linhasCustoOpts.length > 0 && !linhaCusto
                          ? 'Escolha a linha'
                          : 'Busque o item…'
                    }
                    options={custos.map((c) => ({
                      value: String(c.idCusto),
                      label: c.rotulo,
                    }))}
                    onChange={setIdCusto}
                  />
                )}
              </div>
            </div>
          )}

          <div className="lanc-fields-row compact">
            <div className="field">
              <label htmlFor="qtd-custo">Quantidade</label>
              <input
                id="qtd-custo"
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="unitario-custo">Valor unitário (R$)</label>
              <input
                id="unitario-custo"
                inputMode="decimal"
                placeholder="0,00"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="total-custo">Valor total</label>
              <input
                id="total-custo"
                className="lanc-computed"
                readOnly
                tabIndex={-1}
                value={money(totalGastoForm({ quantidade, valorUnitario }))}
              />
            </div>
          </div>

          {!editando && (
            <>
              <label className="lanc-check">
                <input
                  type="checkbox"
                  checked={associar}
                  onChange={(e) => {
                    setAssociar(e.target.checked)
                    if (!e.target.checked) setIdVenda('')
                  }}
                />
                Este custo está associado a uma venda
              </label>

              {associar ? (
                <fieldset className="lanc-fieldset soft">
                  <legend>Venda</legend>
                  <div className="field">
                    <label htmlFor="busca-venda">Pesquisar</label>
                    <input
                      id="busca-venda"
                      value={buscaVenda}
                      onChange={(e) => setBuscaVenda(e.target.value)}
                      placeholder="Cliente, linha, observação…"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="venda-sel">Selecionar venda</label>
                    <SearchableSelect
                      id="venda-sel"
                      value={idVenda}
                      required={associar}
                      placeholder="Busque a venda…"
                      options={vendas.map((v) => ({
                        value: v.idVenda,
                        label:
                          v.rotulo ||
                          [
                            v.dataVenda.split('-').reverse().join('/'),
                            money(v.valorTotal),
                            v.cliente,
                            v.resumo,
                          ]
                            .filter(Boolean)
                            .join(' · '),
                      }))}
                      onChange={setIdVenda}
                    />
                  </div>
                </fieldset>
              ) : (
                <p className="lanc-muted">
                  Sem associação → custo vai para estoque.
                </p>
              )}
            </>
          )}

          {editando && (
            <p className="lanc-muted">
              Só é possível alterar quantidade, valor unitário
              {isOutros ? ' e a descrição' : ''}. O tipo e o item do catálogo
              permanecem.
            </p>
          )}

          <div className="lanc-form-footer">
            <button type="submit" className="btn btn-accent" disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="spin" size={16} /> Salvando…
                </>
              ) : editando ? (
                'Salvar alterações'
              ) : (
                'Confirmar custo'
              )}
            </button>
          </div>

          {erro && <p className="lanc-error">{erro}</p>}
        </form>
      )}
    </FormShell>
  )
}
