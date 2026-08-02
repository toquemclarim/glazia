import {
  ArrowLeft,
  Check,
  Loader2,
  List,
  Minus,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  atualizarVendaLancamento,
  criarCustoLancamento,
  criarVendaLancamento,
  excluirVendaLancamento,
  listarClientes,
  listarCustosCatalogo,
  listarLinhasCatalogo,
  listarLinhasCustoCatalogo,
  listarProdutosCatalogo,
  listarTiposCustoCatalogo,
  listarVendasLancamento,
  obterVendaLancamento,
} from '../services/api'
import type {
  CatalogoCustoItem,
  CatalogoProdutoItem,
  Cliente,
  VendaResumo,
} from '../types'
import { ClienteFormModal } from '../components/ClienteFormModal'
import { ItemPreview } from '../components/ItemPreview'
import { onTourAction } from '../tour/events'

type Modo = null | 'venda' | 'custo' | 'gerenciar'

type ItemForm = {
  key: string
  produto: string
  linha: string
  cor: string
  quantidade: string
  valorUnitario: string
}

type GastoForm = {
  key: string
  itemKey: string
  idCusto: string
  valor: string
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function emptyItem(): ItemForm {
  return {
    key: uid(),
    produto: '',
    linha: '',
    cor: '',
    quantidade: '1',
    valorUnitario: '',
  }
}

export function Lancamentos() {
  const [modo, setModo] = useState<Modo>(null)
  const [editVendaId, setEditVendaId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  useEffect(() => {
    return onTourAction((action) => {
      if (action === 'reset-lancamentos') {
        setModo(null)
        setEditVendaId(null)
        setErro(null)
      }
      if (action === 'open-venda') {
        setErro(null)
        setSucesso(null)
        setEditVendaId(null)
        setModo('venda')
      }
      if (action === 'open-custo') {
        setErro(null)
        setSucesso(null)
        setModo('custo')
      }
    })
  }, [])

  return (
    <div className="lanc-page">
      {modo === null && (
        <>
          <header className="lanc-intro fade-up">
            <p className="section-title" style={{ marginBottom: '0.35rem' }}>
              Operação do dia
            </p>
            <h2 className="lanc-title">O que você quer lançar?</h2>
            <p className="lanc-subtitle">
              Formulários com menus do catálogo. Os fatos vão para o analytics.
            </p>
          </header>

          <div className="lanc-hub">
            <button
              type="button"
              data-tour="lanc-venda"
              className="lanc-choice glass sale fade-up fade-up-delay-1"
              onClick={() => {
                setErro(null)
                setSucesso(null)
                setEditVendaId(null)
                setModo('venda')
              }}
            >
              <span className="lanc-choice-orb" aria-hidden="true" />
              <span className="lanc-choice-icon">
                <TrendingUp size={28} />
              </span>
              <span className="lanc-choice-copy">
                <strong>Lançar venda</strong>
                <span>Itens, valores e previsão de recebimento</span>
              </span>
              <span className="lanc-choice-pulse plus" aria-hidden="true">
                <Plus size={16} />
              </span>
            </button>

            <button
              type="button"
              data-tour="lanc-custo"
              className="lanc-choice glass cost fade-up fade-up-delay-2"
              onClick={() => {
                setErro(null)
                setSucesso(null)
                setModo('custo')
              }}
            >
              <span className="lanc-choice-orb" aria-hidden="true" />
              <span className="lanc-choice-icon">
                <TrendingDown size={28} />
              </span>
              <span className="lanc-choice-copy">
                <strong>Lançar custo</strong>
                <span>Estoque ou associado a uma venda</span>
              </span>
              <span className="lanc-choice-pulse minus" aria-hidden="true">
                <Minus size={16} />
              </span>
            </button>

            <button
              type="button"
              data-tour="lanc-gerenciar"
              className="lanc-choice glass fade-up fade-up-delay-3"
              onClick={() => {
                setErro(null)
                setSucesso(null)
                setModo('gerenciar')
              }}
            >
              <span className="lanc-choice-orb" aria-hidden="true" />
              <span className="lanc-choice-icon">
                <List size={28} />
              </span>
              <span className="lanc-choice-copy">
                <strong>Gerenciar vendas</strong>
                <span>Editar ou excluir lançamentos recentes</span>
              </span>
            </button>
          </div>
        </>
      )}

      {modo === 'venda' && (
        <FormVenda
          vendaId={editVendaId}
          onBack={() => {
            setEditVendaId(null)
            setModo(editVendaId ? 'gerenciar' : null)
          }}
          onDone={(msg) => {
            setSucesso(msg)
            setEditVendaId(null)
            setModo(null)
          }}
          erro={erro}
          setErro={setErro}
        />
      )}

      {modo === 'gerenciar' && (
        <GerenciarVendas
          onBack={() => setModo(null)}
          onEdit={(id) => {
            setErro(null)
            setEditVendaId(id)
            setModo('venda')
          }}
          onDeleted={(msg) => setSucesso(msg)}
          erro={erro}
          setErro={setErro}
        />
      )}

      {modo === 'custo' && (
        <FormCusto
          onBack={() => setModo(null)}
          onDone={(msg) => {
            setSucesso(msg)
            setModo(null)
          }}
          erro={erro}
          setErro={setErro}
        />
      )}

      {sucesso && (modo === null || modo === 'gerenciar') && (
        <div className="lanc-toast success glass fade-up" role="status">
          <Check size={18} />
          <span>{sucesso}</span>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setSucesso(null)}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function FormShell({
  title,
  tone,
  onBack,
  children,
  previews,
}: {
  title: string
  tone: 'sale' | 'cost'
  onBack: () => void
  children: ReactNode
  previews: Array<{ key: string; kind: string; label: string }>
}) {
  return (
    <div className={`lanc-form-shell glass fade-up ${tone}`}>
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
            <ItemPreview kind="JANELA" label="Selecione um produto" tone={tone} />
          ) : (
            <div className="lanc-preview-stack">
              {previews.map((p, index) => (
                <ItemPreview
                  key={p.key}
                  kind={p.kind}
                  label={p.label}
                  tone={tone}
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

function FormVenda({
  vendaId,
  onBack,
  onDone,
  erro,
  setErro,
}: {
  vendaId?: string | null
  onBack: () => void
  onDone: (msg: string) => void
  erro: string | null
  setErro: (v: string | null) => void
}) {
  const editando = Boolean(vendaId)
  const [linhasOpts, setLinhasOpts] = useState<string[]>([])
  /** Cache de SKUs por linha — carrega sob demanda (evita truncar o catálogo). */
  const [skusPorLinha, setSkusPorLinha] = useState<
    Record<string, CatalogoProdutoItem[]>
  >({})
  const [custosPorLinha, setCustosPorLinha] = useState<
    Record<string, CatalogoCustoItem[]>
  >({})
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [idCliente, setIdCliente] = useState('')
  const [modalCliente, setModalCliente] = useState(false)
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()])
  const [gastos, setGastos] = useState<GastoForm[]>([])
  const [incluirGastos, setIncluirGastos] = useState(false)
  const [previsao, setPrevisao] = useState(todayInput())
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [carregandoLinha, setCarregandoLinha] = useState<string | null>(null)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [jaRecebido, setJaRecebido] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<{
    idCliente: string
    dataPrevisaoRecebimento: string
    observacao?: string
    itens: Parameters<typeof criarVendaLancamento>[0]['itens']
  } | null>(null)

  const carregarClientes = async () => {
    const res = await listarClientes()
    setClientes(res.itens.filter((c) => c.matricula !== '00000001'))
  }

  const garantirSkusLinha = async (linha: string) => {
    if (!linha || skusPorLinha[linha]) return
    setCarregandoLinha(linha)
    try {
      const res = await listarProdutosCatalogo({ linha })
      setSkusPorLinha((prev) => ({ ...prev, [linha]: res.itens }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar produtos da linha')
    } finally {
      setCarregandoLinha(null)
    }
  }

  const garantirCustosLinha = async (linha: string) => {
    if (!linha || custosPorLinha[linha]) return
    try {
      const res = await listarCustosCatalogo({ linha })
      setCustosPorLinha((prev) => ({ ...prev, [linha]: res.itens }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar custos da linha')
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [linhas, cli] = await Promise.all([
          listarLinhasCatalogo(),
          listarClientes(),
        ])
        if (!alive) return
        setLinhasOpts(linhas.itens.map((i) => i.linha))
        setClientes(cli.itens.filter((c) => c.matricula !== '00000001'))

        if (!vendaId) return

        const det = await obterVendaLancamento(vendaId)
        if (!alive) return
        setIdCliente(det.idCliente ?? '')
        setPrevisao(det.dataPrevisaoRecebimento || todayInput())
        setObservacao(det.observacao ?? '')
        setJaRecebido(det.jaRecebido)

        const nextItens: ItemForm[] = []
        const nextGastos: GastoForm[] = []
        const linhasUsadas = new Set<string>()

        for (const item of det.itens) {
          const key = uid()
          nextItens.push({
            key,
            linha: item.linha,
            produto: item.produto,
            cor: item.cor,
            quantidade: String(item.quantidade).replace('.', ','),
            valorUnitario: String(item.valorUnitario).replace('.', ','),
          })
          if (item.linha) linhasUsadas.add(item.linha)
          for (const g of item.gastos) {
            nextGastos.push({
              key: uid(),
              itemKey: key,
              idCusto: String(g.idCustoCatalogo),
              valor: String(g.valor).replace('.', ','),
            })
          }
        }

        setItens(nextItens.length ? nextItens : [emptyItem()])
        setGastos(nextGastos)
        setIncluirGastos(nextGastos.length > 0)

        await Promise.all(
          [...linhasUsadas].map(async (linha) => {
            const [prods, custs] = await Promise.all([
              listarProdutosCatalogo({ linha }),
              listarCustosCatalogo({ linha }),
            ])
            if (!alive) return
            setSkusPorLinha((prev) => ({ ...prev, [linha]: prods.itens }))
            setCustosPorLinha((prev) => ({ ...prev, [linha]: custs.itens }))
          }),
        )
      } catch (e) {
        if (alive) {
          setErro(
            e instanceof Error ? e.message : 'Erro ao carregar catálogo/venda',
          )
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [setErro, vendaId])

  /** Cascata canônica: Linha → Produto → Cor (dados da linha carregada). */
  const produtosPara = (linha: string) =>
    [
      ...new Set((skusPorLinha[linha] ?? []).map((c) => c.produto)),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const coresPara = (linha: string, produto: string) =>
    [
      ...new Set(
        (skusPorLinha[linha] ?? [])
          .filter((c) => c.produto === produto)
          .map((c) => c.cor),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const resolveSku = (item: ItemForm) =>
    (skusPorLinha[item.linha] ?? []).find(
      (c) =>
        c.linha === item.linha &&
        c.produto === item.produto &&
        c.cor === item.cor,
    )

  const custosCat = useMemo(() => {
    const all: CatalogoCustoItem[] = []
    const seen = new Set<number>()
    for (const lista of Object.values(custosPorLinha)) {
      for (const c of lista) {
        if (seen.has(c.idCusto)) continue
        seen.add(c.idCusto)
        all.push(c)
      }
    }
    return all
  }, [custosPorLinha])

  const total = itens.reduce((acc, item) => {
    const q = Number(item.quantidade.replace(',', '.'))
    const v = Number(item.valorUnitario.replace(',', '.'))
    if (!(q > 0) || !(v >= 0)) return acc
    return acc + q * v
  }, 0)

  const previewList = itens
    .filter((i) => i.linha || i.produto)
    .map((i, index) => ({
      key: i.key,
      kind: i.produto || i.linha,
      label: [
        `Item ${itens.findIndex((x) => x.key === i.key) + 1}`,
        i.linha,
        i.produto,
        i.cor,
      ]
        .filter(Boolean)
        .join(' · '),
      index,
    }))

  const updateItem = (key: string, patch: Partial<ItemForm>) => {
    if (patch.linha) {
      void garantirSkusLinha(patch.linha)
      if (incluirGastos) void garantirCustosLinha(patch.linha)
    }
    setItens((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const next = { ...item, ...patch }
        if (patch.linha !== undefined) {
          next.produto = ''
          next.cor = ''
        } else if (patch.produto !== undefined) {
          next.cor = ''
        }
        return next
      }),
    )
  }

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)

    const payloadItens = []
    for (const item of itens) {
      const sku = resolveSku(item)
      if (!sku) {
        setErro('Preencha linha, produto e cor em todos os itens')
        return
      }
      const quantidade = Number(item.quantidade.replace(',', '.'))
      const valorUnitario = Number(item.valorUnitario.replace(',', '.'))
      if (!(quantidade > 0) || Number.isNaN(valorUnitario) || valorUnitario < 0) {
        setErro('Quantidade e valor unitário inválidos')
        return
      }

      const gastosDoItem = incluirGastos
        ? gastos.filter((g) => g.itemKey === item.key)
        : []

      const gastosPayload = []
      for (const g of gastosDoItem) {
        const cat = custosCat.find((c) => String(c.idCusto) === g.idCusto)
        const valor = Number(g.valor.replace(',', '.'))
        if (!cat || !(valor > 0)) {
          setErro('Selecione o custo e informe o valor em todos os gastos')
          return
        }
        gastosPayload.push({
          idCustoCatalogo: cat.idCusto,
          descricao: cat.descricao,
          tipoCusto: cat.tipoCusto,
          espessura: cat.espessura,
          linha: cat.linha,
          valor,
          quantidade: 1,
        })
      }

      payloadItens.push({
        idProdutoCatalogo: sku.idProduto,
        linha: sku.linha,
        produto: sku.produto,
        cor: sku.cor,
        unidadeVenda: sku.unidadeVenda,
        quantidade,
        valorUnitario,
        gastos: gastosPayload,
      })
    }

    if (!idCliente) {
      setErro('Selecione o cliente da venda')
      return
    }

    if (!previsao) {
      setErro('Informe a previsão de recebimento')
      return
    }

    const payload = {
      idCliente,
      dataPrevisaoRecebimento: previsao,
      observacao: observacao.trim() || undefined,
      itens: payloadItens,
    }

    if (editando) {
      setPendingPayload(payload)
      setConfirmEdit(true)
      return
    }

    setSalvando(true)
    try {
      const res = await criarVendaLancamento(payload)
      onDone(
        `${res.mensagem} · ${money(res.valorTotal)} · ${res.qtdItens} item(ns)`,
      )
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao salvar venda')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarEdicao = async () => {
    if (!vendaId || !pendingPayload) return
    setSalvando(true)
    setErro(null)
    try {
      const res = await atualizarVendaLancamento(vendaId, pendingPayload)
      setConfirmEdit(false)
      setPendingPayload(null)
      onDone(
        `${res.mensagem} · ${money(res.valorTotal)} · ${res.qtdItens} item(ns)`,
      )
    } catch (cause) {
      setErro(
        cause instanceof Error ? cause.message : 'Falha ao atualizar venda',
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
    <FormShell
      title={editando ? 'Editar venda' : 'Nova venda'}
      tone="sale"
      onBack={onBack}
      previews={previewList}
    >
      {loading ? (
        <p className="lanc-muted">
          <Loader2 className="spin" size={16} /> Carregando catálogo…
        </p>
      ) : (
        <form className="lanc-form-grid" onSubmit={(e) => void salvar(e)}>
          <fieldset className="lanc-fieldset" data-tour="lanc-cliente">
            <legend>Cliente</legend>
            <div className="lanc-fields-row">
              <div className="field full">
                <label htmlFor="venda-cliente">Quem comprou?</label>
                <div className="cliente-select-row">
                  <select
                    id="venda-cliente"
                    value={idCliente}
                    onChange={(e) => setIdCliente(e.target.value)}
                    required
                  >
                    <option value="">Selecione o cliente…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.matricula}>
                        {c.matricula} · {c.nome} ({c.tipoPessoa})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setModalCliente(true)}
                  >
                    <Plus size={16} /> Novo cliente
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          {itens.map((item, index) => (
            <fieldset
              key={item.key}
              className="lanc-fieldset"
              data-tour={index === 0 ? 'lanc-itens' : undefined}
            >
              <legend>Item {index + 1}</legend>

              <div className="lanc-fields-row">
                <div className="field">
                  <label htmlFor={`linha-${item.key}`}>1. Linha</label>
                  <select
                    id={`linha-${item.key}`}
                    value={item.linha}
                    onChange={(e) =>
                      updateItem(item.key, { linha: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione a linha…</option>
                    {linhasOpts.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  {carregandoLinha === item.linha && (
                    <span className="lanc-muted" style={{ fontSize: '0.75rem' }}>
                      Carregando produtos…
                    </span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor={`prod-${item.key}`}>2. Produto</label>
                  <select
                    id={`prod-${item.key}`}
                    value={item.produto}
                    disabled={!item.linha || !skusPorLinha[item.linha]}
                    onChange={(e) =>
                      updateItem(item.key, { produto: e.target.value })
                    }
                    required
                  >
                    <option value="">
                      {!item.linha
                        ? 'Escolha a linha'
                        : !skusPorLinha[item.linha]
                          ? 'Carregando…'
                          : 'Selecione o produto…'}
                    </option>
                    {produtosPara(item.linha).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor={`cor-${item.key}`}>3. Cor</label>
                  <select
                    id={`cor-${item.key}`}
                    value={item.cor}
                    disabled={!item.produto}
                    onChange={(e) =>
                      updateItem(item.key, { cor: e.target.value })
                    }
                    required
                  >
                    <option value="">
                      {item.produto ? 'Selecione a cor…' : 'Escolha o produto'}
                    </option>
                    {coresPara(item.linha, item.produto).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lanc-fields-row compact">
                <div className="field">
                  <label htmlFor={`qtd-${item.key}`}>Quantidade</label>
                  <input
                    id={`qtd-${item.key}`}
                    inputMode="decimal"
                    value={item.quantidade}
                    onChange={(e) =>
                      updateItem(item.key, { quantidade: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`vu-${item.key}`}>Valor unitário (R$)</label>
                  <input
                    id={`vu-${item.key}`}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={item.valorUnitario}
                    onChange={(e) =>
                      updateItem(item.key, { valorUnitario: e.target.value })
                    }
                    required
                  />
                </div>
                {itens.length > 1 && (
                  <button
                    type="button"
                    className="btn-ghost lanc-remove"
                    onClick={() =>
                      setItens((prev) => prev.filter((i) => i.key !== item.key))
                    }
                  >
                    <Trash2 size={16} /> Remover
                  </button>
                )}
              </div>
            </fieldset>
          ))}

          <button
            type="button"
            className="btn btn-ghost lanc-add-row"
            onClick={() => setItens((prev) => [...prev, emptyItem()])}
          >
            <Plus size={16} /> Adicionar item
          </button>

          <div className="lanc-fields-row" data-tour="lanc-previsao">
            <div className="field">
              <label htmlFor="previsao">Previsão de recebimento</label>
              <input
                id="previsao"
                type="date"
                value={previsao}
                onChange={(e) => setPrevisao(e.target.value)}
                required
              />
            </div>
            <div className="field full">
              <label htmlFor="obs-venda">Observação (opcional)</label>
              <input
                id="obs-venda"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Obra, referência, observações…"
              />
            </div>
          </div>

          <label className="lanc-check">
            <input
              type="checkbox"
              checked={incluirGastos}
              onChange={(e) => {
                setIncluirGastos(e.target.checked)
                if (!e.target.checked) {
                  setGastos([])
                  return
                }
                for (const i of itens) {
                  if (i.linha) void garantirCustosLinha(i.linha)
                }
              }}
            />
            Incluir gastos nestes itens (custos variáveis atrelados à venda e ao
            cliente)
          </label>

          {incluirGastos && (
            <fieldset className="lanc-fieldset soft">
              <legend>Gastos</legend>
              {gastos.map((g) => {
                const itemRef = itens.find((i) => i.key === g.itemKey)
                const custosDoItem = itemRef?.linha
                  ? (custosPorLinha[itemRef.linha] ?? [])
                  : custosCat
                return (
                <div key={g.key} className="lanc-fields-row compact">
                  <div className="field">
                    <label>Item da venda</label>
                    <select
                      value={g.itemKey}
                      onChange={(e) => {
                        const nextItem = itens.find((i) => i.key === e.target.value)
                        if (nextItem?.linha) void garantirCustosLinha(nextItem.linha)
                        setGastos((prev) =>
                          prev.map((x) =>
                            x.key === g.key
                              ? { ...x, itemKey: e.target.value, idCusto: '' }
                              : x,
                          ),
                        )
                      }}
                    >
                      {itens.map((i, idx) => (
                        <option key={i.key} value={i.key}>
                          Item {idx + 1}
                          {i.linha ? ` · ${i.linha}` : ''}
                          {i.produto ? ` · ${i.produto}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field grow">
                    <label>Custo</label>
                    <select
                      value={g.idCusto}
                      onChange={(e) =>
                        setGastos((prev) =>
                          prev.map((x) =>
                            x.key === g.key
                              ? { ...x, idCusto: e.target.value }
                              : x,
                          ),
                        )
                      }
                      required={incluirGastos}
                    >
                      <option value="">
                        {itemRef?.linha && !custosPorLinha[itemRef.linha]
                          ? 'Carregando custos…'
                          : 'Selecione…'}
                      </option>
                      {custosDoItem.map((c) => (
                        <option key={c.idCusto} value={c.idCusto}>
                          {c.rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Valor (R$)</label>
                    <input
                      inputMode="decimal"
                      value={g.valor}
                      onChange={(e) =>
                        setGastos((prev) =>
                          prev.map((x) =>
                            x.key === g.key
                              ? { ...x, valor: e.target.value }
                              : x,
                          ),
                        )
                      }
                      required={incluirGastos}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-ghost lanc-remove"
                    onClick={() =>
                      setGastos((prev) => prev.filter((x) => x.key !== g.key))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                )
              })}
              <button
                type="button"
                className="btn btn-ghost lanc-add-row"
                onClick={() => {
                  const first = itens[0]
                  if (first?.linha) void garantirCustosLinha(first.linha)
                  setGastos((prev) => [
                    ...prev,
                    {
                      key: uid(),
                      itemKey: first?.key ?? '',
                      idCusto: '',
                      valor: '',
                    },
                  ])
                }}
              >
                <Plus size={16} /> Adicionar gasto
              </button>
            </fieldset>
          )}

          <div className="lanc-form-footer">
            <div className="lanc-total">
              Total <strong>{money(total)}</strong>
            </div>
            <button
              type="submit"
              data-tour="lanc-salvar-venda"
              className="btn btn-accent"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="spin" size={16} /> Salvando…
                </>
              ) : editando ? (
                'Salvar alterações'
              ) : (
                'Confirmar venda'
              )}
            </button>
          </div>

          {erro && <p className="lanc-error">{erro}</p>}
        </form>
      )}
    </FormShell>

    <ClienteFormModal
      open={modalCliente}
      onClose={() => setModalCliente(false)}
      onSaved={(cli) => {
        void carregarClientes().then(() => setIdCliente(cli.matricula))
      }}
    />

    {confirmEdit && (
      <div className="df-drawer-backdrop" role="presentation">
        <div
          className="df-confirm glass"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="lanc-edit-venda-title"
        >
          <h3 id="lanc-edit-venda-title">Confirmar edição da venda</h3>
          <p>
            Tem certeza que deseja salvar as alterações nesta venda?
            {jaRecebido
              ? ' Esta venda já tem recebimento marcado — o valor no caixa também será atualizado.'
              : ' Itens, cliente, valores e previsão serão substituídos.'}
          </p>
          <div className="df-form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={salvando}
              onClick={() => {
                setConfirmEdit(false)
                setPendingPayload(null)
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-accent"
              disabled={salvando}
              onClick={() => void confirmarEdicao()}
            >
              {salvando ? (
                <>
                  <Loader2 className="spin" size={16} /> Salvando…
                </>
              ) : (
                'Sim, salvar edição'
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function GerenciarVendas({
  onBack,
  onEdit,
  onDeleted,
  erro,
  setErro,
}: {
  onBack: () => void
  onEdit: (idVenda: string) => void
  onDeleted: (msg: string) => void
  erro: string | null
  setErro: (v: string | null) => void
}) {
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState<VendaResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    let alive = true
    const t = window.setTimeout(() => {
      setLoading(true)
      listarVendasLancamento(busca)
        .then((res) => {
          if (alive) setItens(res.itens)
        })
        .catch((e) =>
          setErro(e instanceof Error ? e.message : 'Erro ao listar vendas'),
        )
        .finally(() => {
          if (alive) setLoading(false)
        })
    }, busca ? 250 : 0)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [busca, setErro])

  const alvo = itens.find((v) => v.idVenda === confirmId)

  const confirmarExclusao = async () => {
    if (!confirmId) return
    setExcluindo(true)
    setErro(null)
    try {
      const res = await excluirVendaLancamento(confirmId)
      setItens((prev) => prev.filter((v) => v.idVenda !== confirmId))
      setConfirmId(null)
      onDeleted(res.mensagem)
    } catch (cause) {
      setErro(
        cause instanceof Error ? cause.message : 'Falha ao excluir a venda',
      )
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="lanc-form-shell glass fade-up sale">
      <div className="lanc-wizard-top">
        <button type="button" className="btn-ghost lanc-back" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h2>Gerenciar vendas</h2>
      </div>

      <div className="field" style={{ marginBottom: '1rem' }}>
        <label htmlFor="gerenciar-busca">Pesquisar</label>
        <input
          id="gerenciar-busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Cliente, linha, observação…"
        />
      </div>

      {loading ? (
        <p className="lanc-muted">
          <Loader2 className="spin" size={16} /> Carregando vendas…
        </p>
      ) : itens.length === 0 ? (
        <p className="lanc-muted">Nenhuma venda encontrada.</p>
      ) : (
        <ul className="home-venc-list" style={{ margin: 0 }}>
          {itens.map((v) => (
            <li key={v.idVenda}>
              <div>
                <strong>
                  {v.dataVenda.split('-').reverse().join('/')} ·{' '}
                  {money(v.valorTotal)}
                </strong>
                <span>
                  {[v.cliente, v.resumo].filter(Boolean).join(' · ') ||
                    'Venda'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onEdit(v.idVenda)}
                  title="Editar"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmId(v.idVenda)}
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
            aria-labelledby="lanc-del-venda-title"
          >
            <h3 id="lanc-del-venda-title">Confirmar exclusão</h3>
            <p>
              Tem certeza que deseja excluir a venda de{' '}
              <strong>
                {alvo.dataVenda.split('-').reverse().join('/')} ·{' '}
                {money(alvo.valorTotal)}
              </strong>
              {alvo.cliente ? ` (${alvo.cliente})` : ''}? Esta ação remove
              itens, custos vinculados e a previsão/recebimento no caixa.
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
                  'Sim, excluir venda'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormCusto({
  onBack,
  onDone,
  erro,
  setErro,
}: {
  onBack: () => void
  onDone: (msg: string) => void
  erro: string | null
  setErro: (v: string | null) => void
}) {
  const [tipos, setTipos] = useState<string[]>([])
  const [custos, setCustos] = useState<CatalogoCustoItem[]>([])
  const [vendas, setVendas] = useState<VendaResumo[]>([])
  const [tipo, setTipo] = useState('')
  const [linhaCusto, setLinhaCusto] = useState('')
  const [idCusto, setIdCusto] = useState('')
  const [valor, setValor] = useState('')
  const [associar, setAssociar] = useState(false)
  const [idVenda, setIdVenda] = useState('')
  const [buscaVenda, setBuscaVenda] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarTiposCustoCatalogo()
      .then((res) => setTipos(res.itens.map((i) => i.tipoCusto)))
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao carregar tipos'),
      )
      .finally(() => setLoading(false))
  }, [setErro])

  const [linhasCustoOpts, setLinhasCustoOpts] = useState<string[]>([])

  useEffect(() => {
    if (!tipo) {
      setCustos([])
      setLinhasCustoOpts([])
      setLinhaCusto('')
      setIdCusto('')
      return
    }
    setLinhaCusto('')
    setIdCusto('')
    setCustos([])
    listarLinhasCustoCatalogo(tipo)
      .then((res) => {
        const linhas = res.itens.map((i) => i.linha)
        setLinhasCustoOpts(linhas)
        // Sem linha no catálogo: carrega itens só pelo tipo
        if (linhas.length === 0) {
          return listarCustosCatalogo({ tipoCusto: tipo }).then((c) =>
            setCustos(c.itens),
          )
        }
      })
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao carregar linhas'),
      )
  }, [tipo, setErro])

  useEffect(() => {
    if (!tipo || !linhaCusto) {
      if (!tipo || linhasCustoOpts.length > 0) {
        if (!linhaCusto) setCustos([])
      }
      setIdCusto('')
      return
    }
    setIdCusto('')
    listarCustosCatalogo({ tipoCusto: tipo, linha: linhaCusto })
      .then((res) => setCustos(res.itens))
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao carregar custos'),
      )
  }, [tipo, linhaCusto, linhasCustoOpts.length, setErro])

  const itensCustoOpts = custos

  useEffect(() => {
    if (!associar) return
    const t = setTimeout(() => {
      listarVendasLancamento(buscaVenda)
        .then((res) => setVendas(res.itens))
        .catch((e) =>
          setErro(e instanceof Error ? e.message : 'Erro ao listar vendas'),
        )
    }, 250)
    return () => clearTimeout(t)
  }, [associar, buscaVenda, setErro])

  const escolhido = custos.find((c) => String(c.idCusto) === idCusto)
  const previewList = [
    {
      key: 'custo-preview',
      kind: escolhido?.tipoCusto || escolhido?.descricao || tipo || 'VIDRO',
      label: escolhido?.rotulo || tipo || 'Selecione um custo',
    },
  ]

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    if (!escolhido) {
      setErro('Selecione o item de custo')
      return
    }
    const v = Number(valor.replace(',', '.'))
    if (!(v > 0)) {
      setErro('Informe um valor válido')
      return
    }
    if (associar && !idVenda) {
      setErro('Selecione a venda para associar')
      return
    }

    setSalvando(true)
    try {
      const res = await criarCustoLancamento({
        idCustoCatalogo: escolhido.idCusto,
        descricao: escolhido.descricao,
        tipoCusto: escolhido.tipoCusto,
        espessura: escolhido.espessura,
        linha: escolhido.linha,
        valor: v,
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
      title="Novo custo"
      tone="cost"
      onBack={onBack}
      previews={previewList}
    >
      {loading ? (
        <p className="lanc-muted">
          <Loader2 className="spin" size={16} /> Carregando…
        </p>
      ) : (
        <form className="lanc-form-grid" onSubmit={(e) => void salvar(e)}>
          <div className="lanc-fields-row">
            <div className="field">
              <label htmlFor="tipo-custo">1. Tipo de custo</label>
              <select
                id="tipo-custo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
              >
                <option value="">Selecione o tipo…</option>
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {linhasCustoOpts.length > 0 && (
              <div className="field">
                <label htmlFor="linha-custo">2. Linha</label>
                <select
                  id="linha-custo"
                  value={linhaCusto}
                  disabled={!tipo}
                  onChange={(e) => {
                    setLinhaCusto(e.target.value)
                    setIdCusto('')
                  }}
                  required
                >
                  <option value="">
                    {tipo ? 'Selecione a linha…' : 'Escolha o tipo'}
                  </option>
                  {linhasCustoOpts.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field grow">
              <label htmlFor="item-custo">
                {linhasCustoOpts.length > 0 ? '3. Item' : '2. Item'}
              </label>
              <select
                id="item-custo"
                value={idCusto}
                disabled={
                  !tipo || (linhasCustoOpts.length > 0 && !linhaCusto)
                }
                onChange={(e) => setIdCusto(e.target.value)}
                required
              >
                <option value="">
                  {!tipo
                    ? 'Escolha o tipo'
                    : linhasCustoOpts.length > 0 && !linhaCusto
                      ? 'Escolha a linha'
                      : 'Selecione o item…'}
                </option>
                {itensCustoOpts.map((c) => (
                  <option key={c.idCusto} value={c.idCusto}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lanc-fields-row compact">
            <div className="field">
              <label htmlFor="valor-custo">Valor (R$)</label>
              <input
                id="valor-custo"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>

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
                <select
                  id="venda-sel"
                  value={idVenda}
                  onChange={(e) => setIdVenda(e.target.value)}
                  required={associar}
                >
                  <option value="">Selecione…</option>
                  {vendas.map((v) => (
                    <option key={v.idVenda} value={v.idVenda}>
                      {v.rotulo ||
                        [
                          v.dataVenda.split('-').reverse().join('/'),
                          money(v.valorTotal),
                          v.cliente,
                          v.resumo,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
          ) : (
            <p className="lanc-muted">Sem associação → custo vai para estoque.</p>
          )}

          <div className="lanc-form-footer">
            <button type="submit" className="btn btn-accent" disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="spin" size={16} /> Salvando…
                </>
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
