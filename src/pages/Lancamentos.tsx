import {
  ArrowLeft,
  Check,
  Frame,
  Layers,
  Loader2,
  List,
  Minus,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  atualizarVendaLancamento,
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
  CriarVendaPayload,
  VendaResumo,
} from '../types'
import { ClienteFormModal } from '../components/ClienteFormModal'
import { ItemPreview } from '../components/ItemPreview'
import { SearchableSelect } from '../components/SearchableSelect'
import { onTourAction } from '../tour/events'
import { FormCusto, GerenciarCustos } from './LancamentosCustos'
import {
  COR_SENTINELA,
  aplicarCoresCatalogo,
  chipsCoresItem,
  coresDimPadrao,
  isErroRotaCoresCatalogo,
  labelCorPrincipal,
  mensagemFalhaSalvarVenda,
  perguntaOptIn,
  politicaDaLinha,
  rotuloTipoCor,
  slotsExtras,
  type PoliticaCorLinha,
  type TipoCorPrincipal,
} from '../utils/coresVenda'

type Modo = null | 'venda' | 'custo' | 'gerenciar' | 'gerenciar-custos'

type ItemForm = {
  key: string
  produto: string
  linha: string
  cor: string
  tipoCorPrincipal: TipoCorPrincipal | ''
  corPerfilExtra: string
  corVidroExtra: string
  corAcessorioExtra: string
  informarPerfil: boolean
  informarVidro: boolean
  informarAcessorio: boolean
  quantidade: string
  valorUnitario: string
}

type GastoForm = {
  key: string
  itemKey: string
  tipoCusto: string
  linhaCusto: string
  idCusto: string
  itemLivre: string
  quantidade: string
  valorUnitario: string
}

function emptyGasto(itemKey: string): GastoForm {
  return {
    key: uid(),
    itemKey,
    tipoCusto: '',
    linhaCusto: '',
    idCusto: '',
    itemLivre: '',
    quantidade: '1',
    valorUnitario: '',
  }
}

function ordenarTiposCusto(tipos: string[]) {
  const outros = tipos.filter((t) => t.toUpperCase() === 'OUTROS')
  const rest = tipos
    .filter((t) => t.toUpperCase() !== 'OUTROS')
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return [...rest, ...outros]
}

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
    tipoCorPrincipal: '',
    corPerfilExtra: '',
    corVidroExtra: '',
    corAcessorioExtra: '',
    informarPerfil: false,
    informarVidro: false,
    informarAcessorio: false,
    quantidade: '1',
    valorUnitario: '',
  }
}

const TIPO_COR_UI: Array<{
  id: TipoCorPrincipal
  label: string
  hint: string
  Icon: typeof Frame
}> = [
  { id: 'PERFIL', label: 'Perfil', hint: 'Acabamento do alumínio', Icon: Frame },
  { id: 'VIDRO', label: 'Vidro', hint: 'Incolor, fumê, extra clear…', Icon: Layers },
  {
    id: 'ACESSORIO',
    label: 'Acessórios',
    hint: 'Ferragem, puxador, kit',
    Icon: Wrench,
  },
]

export function Lancamentos() {
  const [modo, setModo] = useState<Modo>(null)
  const [editVendaId, setEditVendaId] = useState<string | null>(null)
  const [editCustoId, setEditCustoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [tourDemoSinal, setTourDemoSinal] = useState<
    'off' | 'escolher' | 'sim'
  >('off')

  useEffect(() => {
    return onTourAction((action) => {
      if (action === 'reset-lancamentos') {
        setModo(null)
        setEditVendaId(null)
        setEditCustoId(null)
        setErro(null)
        setTourDemoSinal('off')
      }
      if (action === 'reset-feature-demo') {
        setTourDemoSinal('off')
      }
      if (action === 'open-venda') {
        setErro(null)
        setSucesso(null)
        setEditVendaId(null)
        setEditCustoId(null)
        setModo('venda')
      }
      if (action === 'open-sinal-demo') {
        setErro(null)
        setSucesso(null)
        setEditVendaId(null)
        setEditCustoId(null)
        setModo('venda')
        setTourDemoSinal('escolher')
      }
      if (action === 'sinal-demo-sim') {
        setErro(null)
        setSucesso(null)
        setEditVendaId(null)
        setModo('venda')
        setTourDemoSinal('sim')
      }
      if (action === 'open-custo') {
        setErro(null)
        setSucesso(null)
        setEditCustoId(null)
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
                setEditCustoId(null)
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

            <button
              type="button"
              data-tour="lanc-gerenciar-custos"
              className="lanc-choice glass cost fade-up fade-up-delay-3"
              onClick={() => {
                setErro(null)
                setSucesso(null)
                setModo('gerenciar-custos')
              }}
            >
              <span className="lanc-choice-orb" aria-hidden="true" />
              <span className="lanc-choice-icon">
                <List size={28} />
              </span>
              <span className="lanc-choice-copy">
                <strong>Gerenciar custos</strong>
                <span>Histórico de custos de estoque (sem venda)</span>
              </span>
            </button>
          </div>
        </>
      )}

      {modo === 'venda' && (
        <FormVenda
          vendaId={editVendaId}
          tourDemoSinal={tourDemoSinal}
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

      {modo === 'gerenciar-custos' && (
        <GerenciarCustos
          onBack={() => setModo(null)}
          onEdit={(id) => {
            setErro(null)
            setEditCustoId(id)
            setModo('custo')
          }}
          onDeleted={(msg) => setSucesso(msg)}
          erro={erro}
          setErro={setErro}
        />
      )}

      {modo === 'custo' && (
        <FormCusto
          custoId={editCustoId}
          onBack={() => {
            setEditCustoId(null)
            setModo(editCustoId ? 'gerenciar-custos' : null)
          }}
          onDone={(msg) => {
            setSucesso(msg)
            setEditCustoId(null)
            setModo(null)
          }}
          erro={erro}
          setErro={setErro}
        />
      )}

      {sucesso &&
        (modo === null ||
          modo === 'gerenciar' ||
          modo === 'gerenciar-custos') && (
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
  tourDemoSinal = 'off',
  onBack,
  onDone,
  erro,
  setErro: setErroProp,
}: {
  vendaId?: string | null
  tourDemoSinal?: 'off' | 'escolher' | 'sim'
  onBack: () => void
  onDone: (msg: string) => void
  erro: string | null
  setErro: (v: string | null) => void
}) {
  const setErro = useCallback(
    (v: string | null) => {
      if (v && isErroRotaCoresCatalogo(v)) {
        setErroProp(null)
        return
      }
      setErroProp(v)
    },
    [setErroProp],
  )
  const editando = Boolean(vendaId)
  const [linhasOpts, setLinhasOpts] = useState<string[]>([])
  const [politicaPorLinha, setPoliticaPorLinha] = useState<
    Record<string, PoliticaCorLinha>
  >({})
  const [coresDim, setCoresDim] = useState<Record<string, string[]>>(
    coresDimPadrao,
  )
  /** Cache de SKUs por linha � carrega sob demanda (evita truncar o catálogo). */
  const [skusPorLinha, setSkusPorLinha] = useState<
    Record<string, CatalogoProdutoItem[]>
  >({})
  const [custosPorFiltro, setCustosPorFiltro] = useState<
    Record<string, CatalogoCustoItem[]>
  >({})
  const [linhasCustoPorTipo, setLinhasCustoPorTipo] = useState<
    Record<string, string[]>
  >({})
  const [tiposCusto, setTiposCusto] = useState<string[]>([])
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
  const [confirmSinal, setConfirmSinal] = useState(false)
  const [sinalModo, setSinalModo] = useState<'escolher' | 'sim'>('escolher')
  const [valorSinalInput, setValorSinalInput] = useState('')
  const [erroSinal, setErroSinal] = useState<string | null>(null)
  const [jaRecebido, setJaRecebido] = useState(false)
  const [recebimentoParcial, setRecebimentoParcial] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<CriarVendaPayload | null>(
    null,
  )

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

  const chaveCusto = (tipo: string, linha: string) => `${tipo}::${linha}`

  const carregarTiposCusto = async () => {
    if (tiposCusto.length) return
    try {
      const res = await listarTiposCustoCatalogo()
      setTiposCusto(ordenarTiposCusto(res.itens.map((i) => i.tipoCusto)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar tipos de custo')
    }
  }

  const garantirLinhasCustoTipo = async (tipo: string) => {
    if (!tipo) return [] as string[]
    const cached = linhasCustoPorTipo[tipo]
    if (cached) return cached
    const res = await listarLinhasCustoCatalogo(tipo)
    const linhas = res.itens.map((i) => i.linha)
    setLinhasCustoPorTipo((prev) => ({ ...prev, [tipo]: linhas }))
    return linhas
  }

  const garantirCustosTipo = async (tipo: string, linha: string) => {
    if (!tipo) return
    const key = chaveCusto(tipo, linha)
    if (custosPorFiltro[key]) return
    const res = await listarCustosCatalogo(
      linha ? { tipoCusto: tipo, linha } : { tipoCusto: tipo },
    )
    setCustosPorFiltro((prev) => ({ ...prev, [key]: res.itens }))
  }

  const resolverLinhaCusto = (tipo: string, linhas: string[]) => {
    if (tipo.toUpperCase() === 'OUTROS') {
      return linhas.find((l) => l.toUpperCase() === 'GERAL') ?? linhas[0] ?? 'GERAL'
    }
    if (linhas.length === 1) return linhas[0]
    return ''
  }

  const aplicarTipoNoGasto = async (gastoKey: string, tipo: string) => {
    if (!tipo) {
      setGastos((prev) =>
        prev.map((x) =>
          x.key === gastoKey
            ? { ...x, tipoCusto: '', linhaCusto: '', idCusto: '', itemLivre: '' }
            : x,
        ),
      )
      return
    }
    const linhas = await garantirLinhasCustoTipo(tipo)
    const linha = resolverLinhaCusto(tipo, linhas)
    if (linha || linhas.length === 0) {
      await garantirCustosTipo(tipo, linha)
    }
    setGastos((prev) =>
      prev.map((x) =>
        x.key === gastoKey
          ? { ...x, tipoCusto: tipo, linhaCusto: linha, idCusto: '', itemLivre: '' }
          : x,
      ),
    )
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
        setPoliticaPorLinha(
          Object.fromEntries(
            linhas.itens.map((i) => [
              i.linha,
              politicaDaLinha(i.linha, i.corPrincipal),
            ]),
          ),
        )
        setClientes(cli.itens.filter((c) => c.matricula !== '00000001'))
        setCoresDim(aplicarCoresCatalogo(linhas.cores))

        if (!vendaId) return

        const det = await obterVendaLancamento(vendaId)
        if (!alive) return
        setIdCliente(det.idCliente ?? '')
        setPrevisao(det.dataPrevisaoRecebimento || todayInput())
        setObservacao(det.observacao ?? '')
        setJaRecebido(det.jaRecebido)
        setRecebimentoParcial(Boolean(det.recebimentoParcial))

        const nextItens: ItemForm[] = []
        const nextGastos: GastoForm[] = []
        const linhasUsadas = new Set<string>()

        for (const item of det.itens) {
          const key = uid()
          const tipo = (item.tipoCorPrincipal ?? 'PERFIL') as TipoCorPrincipal
          nextItens.push({
            key,
            linha: item.linha,
            produto: item.produto,
            cor: item.cor,
            tipoCorPrincipal: tipo,
            informarPerfil: Boolean(item.corPerfil) && tipo !== 'PERFIL',
            informarVidro: Boolean(item.corVidro) && tipo !== 'VIDRO',
            informarAcessorio:
              Boolean(item.corAcessorio) && tipo !== 'ACESSORIO',
            corPerfilExtra: tipo === 'PERFIL' ? '' : (item.corPerfil ?? ''),
            corVidroExtra: tipo === 'VIDRO' ? '' : (item.corVidro ?? ''),
            corAcessorioExtra:
              tipo === 'ACESSORIO' ? '' : (item.corAcessorio ?? ''),
            quantidade: String(item.quantidade).replace('.', ','),
            valorUnitario: String(item.valorUnitario).replace('.', ','),
          })
          if (item.linha) linhasUsadas.add(item.linha)
          for (const g of item.gastos) {
            const tipo = g.tipoCusto ?? ''
            nextGastos.push({
              key: uid(),
              itemKey: key,
              tipoCusto: tipo,
              linhaCusto: g.linha ?? '',
              idCusto: String(g.idCustoCatalogo),
              itemLivre:
                tipo.toUpperCase() === 'OUTROS' ? g.descricao : '',
              quantidade: String(g.quantidade ?? 1).replace('.', ','),
              valorUnitario: String(
                g.valorUnitario ?? g.valor,
              ).replace('.', ','),
            })
          }
        }

        setItens(nextItens.length ? nextItens : [emptyItem()])
        setGastos(nextGastos)
        setIncluirGastos(nextGastos.length > 0)

        await Promise.all(
          [...linhasUsadas].map(async (linha) => {
            const prods = await listarProdutosCatalogo({ linha })
            if (!alive) return
            setSkusPorLinha((prev) => ({ ...prev, [linha]: prods.itens }))
          }),
        )

        if (nextGastos.length) {
          const tiposRes = await listarTiposCustoCatalogo()
          if (!alive) return
          setTiposCusto(
            ordenarTiposCusto(tiposRes.itens.map((i) => i.tipoCusto)),
          )
          const tiposUsados = [
            ...new Set(nextGastos.map((g) => g.tipoCusto).filter(Boolean)),
          ]
          await Promise.all(
            tiposUsados.map(async (tipo) => {
              const linhasRes = await listarLinhasCustoCatalogo(tipo)
              const linhas = linhasRes.itens.map((i) => i.linha)
              if (!alive) return
              setLinhasCustoPorTipo((prev) => ({ ...prev, [tipo]: linhas }))
              const linhasGasto = [
                ...new Set(
                  nextGastos
                    .filter((g) => g.tipoCusto === tipo)
                    .map((g) => g.linhaCusto),
                ),
              ]
              await Promise.all(
                linhasGasto.map(async (linha) => {
                  const custs = await listarCustosCatalogo(
                    linha
                      ? { tipoCusto: tipo, linha }
                      : { tipoCusto: tipo },
                  )
                  if (!alive) return
                  setCustosPorFiltro((prev) => ({
                    ...prev,
                    [chaveCusto(tipo, linha)]: custs.itens,
                  }))
                }),
              )
            }),
          )
        }
      } catch (e) {
        if (alive) {
          const msg =
            e instanceof Error ? e.message : 'Erro ao carregar catálogo/venda'
          if (!isErroRotaCoresCatalogo(msg)) setErro(msg)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [setErro, vendaId])

  /** Cascata canônica: Linha �  Produto �  Cor (dados da linha carregada). */
  const produtosPara = (linha: string) =>
    [
      ...new Set((skusPorLinha[linha] ?? []).map((c) => c.produto)),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const politicaDa = (linha: string): PoliticaCorLinha =>
    politicaPorLinha[linha] ?? politicaDaLinha(linha)

  const tipoDoItem = (item: ItemForm): TipoCorPrincipal | '' => {
    const politica = politicaDa(item.linha)
    if (politica === 'PERFIL' || politica === 'VIDRO') return politica
    return item.tipoCorPrincipal
  }

  const coresPara = (item: ItemForm) => {
    const tipo = tipoDoItem(item)
    const politica = politicaDa(item.linha)
    if (politica === 'PERGUNTAR') {
      if (!tipo) return []
      return coresDim[tipo] ?? []
    }
    return [
      ...new Set(
        (skusPorLinha[item.linha] ?? [])
          .filter((c) => c.produto === item.produto && c.cor !== COR_SENTINELA)
          .map((c) => c.cor),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }

  const coresOptIn = (tipo: TipoCorPrincipal) => coresDim[tipo] ?? []

  const resolveSku = (item: ItemForm) => {
    const lista = skusPorLinha[item.linha] ?? []
    if (politicaDa(item.linha) === 'PERGUNTAR') {
      return lista.find(
        (c) => c.produto === item.produto && c.cor === COR_SENTINELA,
      )
    }
    return lista.find(
      (c) =>
        c.linha === item.linha &&
        c.produto === item.produto &&
        c.cor === item.cor,
    )
  }

  const custosDoGasto = (g: GastoForm) =>
    custosPorFiltro[chaveCusto(g.tipoCusto, g.linhaCusto)] ?? []

  const total = itens.reduce((acc, item) => {
    const q = parseDecimal(item.quantidade)
    const v = parseDecimal(item.valorUnitario)
    if (!(q > 0) || !(v >= 0)) return acc
    return acc + q * v
  }, 0)

  const totalCustos = incluirGastos
    ? gastos.reduce((acc, g) => acc + totalGastoForm(g), 0)
    : 0

  const previewList = itens
    .filter((i) => i.linha || i.produto)
    .map((i, index) => ({
      key: i.key,
      kind: i.produto || i.linha,
      label: [
        `Item ${itens.findIndex((x) => x.key === i.key) + 1}`,
        i.linha,
        i.produto,
        ...chipsCoresItem({
          tipoCorPrincipal: tipoDoItem(i) || undefined,
          cor: i.cor,
          corPerfil: i.informarPerfil ? i.corPerfilExtra : i.tipoCorPrincipal === 'PERFIL' || tipoDoItem(i) === 'PERFIL' ? i.cor : '',
          corVidro:
            tipoDoItem(i) === 'VIDRO'
              ? i.cor
              : i.informarVidro
                ? i.corVidroExtra
                : '',
          corAcessorio:
            tipoDoItem(i) === 'ACESSORIO'
              ? i.cor
              : i.informarAcessorio
                ? i.corAcessorioExtra
                : '',
        }).map((c) => `${rotuloTipoCor(c.tipo)} ${c.cor}`),
      ]
        .filter(Boolean)
        .join(' · '),
      index,
    }))

  const updateItem = (key: string, patch: Partial<ItemForm>) => {
    if (patch.linha) {
      void garantirSkusLinha(patch.linha)
    }
    setItens((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const next = { ...item, ...patch }
        if (patch.linha !== undefined) {
          const politica = politicaDa(patch.linha)
          next.produto = ''
          next.cor = ''
          next.tipoCorPrincipal =
            politica === 'PERGUNTAR' ? '' : politica
          next.informarPerfil = false
          next.informarVidro = false
          next.informarAcessorio = false
          next.corPerfilExtra = ''
          next.corVidroExtra = ''
          next.corAcessorioExtra = ''
        } else if (patch.produto !== undefined) {
          next.cor = ''
        } else if (patch.tipoCorPrincipal !== undefined) {
          next.cor = ''
          next.informarPerfil = false
          next.informarVidro = false
          next.informarAcessorio = false
          next.corPerfilExtra = ''
          next.corVidroExtra = ''
          next.corAcessorioExtra = ''
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
      const tipo = tipoDoItem(item)
      if (!sku || !tipo || !item.cor) {
        setErro(
          politicaDa(item.linha) === 'PERGUNTAR'
            ? 'Em cada item, escolha linha, produto, o tipo da cor principal e a cor'
            : 'Preencha linha, produto e cor em todos os itens',
        )
        return
      }
      for (const extra of slotsExtras(tipo)) {
        const on =
          extra === 'PERFIL'
            ? item.informarPerfil
            : extra === 'VIDRO'
              ? item.informarVidro
              : item.informarAcessorio
        const val =
          extra === 'PERFIL'
            ? item.corPerfilExtra
            : extra === 'VIDRO'
              ? item.corVidroExtra
              : item.corAcessorioExtra
        if (on && !val) {
          setErro(`Informe a ${labelCorPrincipal(extra).toLowerCase()} ou desmarque a opção`)
          return
        }
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
        const cat = g.tipoCusto.toUpperCase() === 'OUTROS'
          ? custosDoGasto(g)[0]
          : custosDoGasto(g).find((c) => String(c.idCusto) === g.idCusto)
        const descricao =
          g.tipoCusto.toUpperCase() === 'OUTROS'
            ? g.itemLivre.trim()
            : cat?.descricao
        const quantidade = parseDecimal(g.quantidade)
        const valorUnitario = parseDecimal(g.valorUnitario)
        const valor = totalGastoForm(g)
        if (
          !cat ||
          !descricao ||
          !(quantidade > 0) ||
          Number.isNaN(valorUnitario) ||
          valorUnitario < 0 ||
          !(valor > 0)
        ) {
          setErro(
            'Selecione o custo e informe quantidade e valor unitário em todos os gastos',
          )
          return
        }
        gastosPayload.push({
          idCustoCatalogo: cat.idCusto,
          descricao,
          tipoCusto: cat.tipoCusto || g.tipoCusto,
          espessura: cat.espessura,
          linha: g.tipoCusto.toUpperCase() === 'OUTROS' ? 'GERAL' : cat.linha,
          valor,
          quantidade,
          valorUnitario,
        })
      }

      payloadItens.push({
        idProdutoCatalogo: sku.idProduto,
        linha: sku.linha,
        produto: sku.produto,
        cor: item.cor,
        tipoCorPrincipal: tipo,
        corPerfil:
          tipo === 'PERFIL'
            ? item.cor
            : item.informarPerfil
              ? item.corPerfilExtra
              : null,
        corVidro:
          tipo === 'VIDRO'
            ? item.cor
            : item.informarVidro
              ? item.corVidroExtra
              : null,
        corAcessorio:
          tipo === 'ACESSORIO'
            ? item.cor
            : item.informarAcessorio
              ? item.corAcessorioExtra
              : null,
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

    setPendingPayload(payload)
    setSinalModo('escolher')
    setValorSinalInput('')
    setErroSinal(null)
    setConfirmSinal(true)
  }

  const confirmarCriacao = async (opts: {
    houveSinal: boolean
    valorSinal?: number
  }) => {
    if (!pendingPayload) return
    setSalvando(true)
    setErro(null)
    setErroSinal(null)
    try {
      const res = await criarVendaLancamento({
        ...pendingPayload,
        houveSinal: opts.houveSinal,
        valorSinal: opts.valorSinal,
      })
      setConfirmSinal(false)
      setPendingPayload(null)
      onDone(
        `${res.mensagem} · ${money(res.valorTotal)} · ${res.qtdItens} item(ns)`,
      )
    } catch (cause) {
      setErroSinal(mensagemFalhaSalvarVenda(cause))
    } finally {
      setSalvando(false)
    }
  }

  const confirmarSemSinal = () => {
    void confirmarCriacao({ houveSinal: false })
  }

  const confirmarComSinal = () => {
    const valor = parseDecimal(valorSinalInput)
    if (!(valor > 0) || Number.isNaN(valor)) {
      setErroSinal('Informe o valor do sinal')
      return
    }
    if (valor > total + 0.001) {
      setErroSinal('O sinal não pode ser maior que o total da venda')
      return
    }
    void confirmarCriacao({
      houveSinal: true,
      valorSinal: Math.round(valor * 100) / 100,
    })
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
      setErro(mensagemFalhaSalvarVenda(cause))
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
                  <SearchableSelect
                    id="venda-cliente"
                    value={idCliente}
                    required
                    placeholder="Busque o cliente…"
                    options={clientes.map((c) => ({
                      value: c.matricula,
                      label: `${c.matricula} · ${c.nome} (${c.tipoPessoa})`,
                    }))}
                    onChange={setIdCliente}
                  />
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
              {item.cor ? (
                <div className="lanc-item-chips">
                  {chipsCoresItem({
                    tipoCorPrincipal: tipoDoItem(item) || undefined,
                    cor: item.cor,
                    corPerfil:
                      tipoDoItem(item) === 'PERFIL'
                        ? item.cor
                        : item.informarPerfil
                          ? item.corPerfilExtra
                          : '',
                    corVidro:
                      tipoDoItem(item) === 'VIDRO'
                        ? item.cor
                        : item.informarVidro
                          ? item.corVidroExtra
                          : '',
                    corAcessorio:
                      tipoDoItem(item) === 'ACESSORIO'
                        ? item.cor
                        : item.informarAcessorio
                          ? item.corAcessorioExtra
                          : '',
                  }).map((c) => (
                    <span key={c.tipo} className="lanc-cor-chip">
                      {rotuloTipoCor(c.tipo)} {c.cor}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="lanc-fields-row">
                <div className="field">
                  <label htmlFor={`linha-${item.key}`}>1. Linha</label>
                  <SearchableSelect
                    id={`linha-${item.key}`}
                    value={item.linha}
                    required
                    placeholder="Busque a linha…"
                    options={linhasOpts.map((l) => ({ value: l, label: l }))}
                    onChange={(linha) => updateItem(item.key, { linha })}
                  />
                  {carregandoLinha === item.linha && (
                    <span className="lanc-muted" style={{ fontSize: '0.75rem' }}>
                      Carregando produtos…
                    </span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor={`prod-${item.key}`}>2. Produto</label>
                  <SearchableSelect
                    id={`prod-${item.key}`}
                    value={item.produto}
                    required
                    disabled={!item.linha || !skusPorLinha[item.linha]}
                    placeholder={
                      !item.linha
                        ? 'Escolha a linha'
                        : !skusPorLinha[item.linha]
                          ? 'Carregando…'
                          : 'Busque o produto…'
                    }
                    options={produtosPara(item.linha).map((p) => ({
                      value: p,
                      label: p,
                    }))}
                    onChange={(produto) => updateItem(item.key, { produto })}
                  />
                </div>
              </div>

              {politicaDa(item.linha) === 'PERGUNTAR' && item.produto ? (
                <div className="lanc-tipo-cor">
                  <p className="lanc-tipo-cor-label">Qual é a cor principal?</p>
                  <div className="lanc-tipo-cor-grid" role="radiogroup">
                    {TIPO_COR_UI.map(({ id, label, hint, Icon }) => {
                      const ativo = item.tipoCorPrincipal === id
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={ativo}
                          className={`lanc-tipo-cor-card${ativo ? ' active' : ''}`}
                          onClick={() =>
                            updateItem(item.key, { tipoCorPrincipal: id })
                          }
                        >
                          <Icon size={18} />
                          <strong>{label}</strong>
                          <span>{hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="lanc-fields-row">
                <div className="field">
                  <label htmlFor={`cor-${item.key}`}>
                    {tipoDoItem(item)
                      ? `3. ${labelCorPrincipal(tipoDoItem(item))}`
                      : '3. Cor'}
                  </label>
                  <SearchableSelect
                    id={`cor-${item.key}`}
                    value={item.cor}
                    required
                    disabled={
                      !item.produto ||
                      (politicaDa(item.linha) === 'PERGUNTAR' &&
                        !item.tipoCorPrincipal)
                    }
                    placeholder={
                      !item.produto
                        ? 'Escolha o produto'
                        : politicaDa(item.linha) === 'PERGUNTAR' &&
                            !item.tipoCorPrincipal
                          ? 'Escolha o tipo da cor'
                          : 'Busque a cor…'
                    }
                    options={coresPara(item).map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    onChange={(cor) => updateItem(item.key, { cor })}
                  />
                </div>
              </div>

              {tipoDoItem(item) && item.produto ? (
                <div className="lanc-opt-cores">
                  <p className="lanc-opt-cores-title">Cores opcionais</p>
                  <p className="lanc-opt-cores-hint">
                    Informe só se quiser. O que ficar em branco entra como não
                    informado na análise.
                  </p>
                  {slotsExtras(tipoDoItem(item) as TipoCorPrincipal).map(
                    (slot) => {
                      const ligado =
                        slot === 'PERFIL'
                          ? item.informarPerfil
                          : slot === 'VIDRO'
                            ? item.informarVidro
                            : item.informarAcessorio
                      const valor =
                        slot === 'PERFIL'
                          ? item.corPerfilExtra
                          : slot === 'VIDRO'
                            ? item.corVidroExtra
                            : item.corAcessorioExtra
                      return (
                        <div key={slot} className="lanc-opt-row">
                          <label className="lanc-opt-toggle">
                            <input
                              type="checkbox"
                              checked={ligado}
                              onChange={(e) => {
                                const on = e.target.checked
                                if (slot === 'PERFIL') {
                                  updateItem(item.key, {
                                    informarPerfil: on,
                                    corPerfilExtra: on
                                      ? item.corPerfilExtra
                                      : '',
                                  })
                                } else if (slot === 'VIDRO') {
                                  updateItem(item.key, {
                                    informarVidro: on,
                                    corVidroExtra: on ? item.corVidroExtra : '',
                                  })
                                } else {
                                  updateItem(item.key, {
                                    informarAcessorio: on,
                                    corAcessorioExtra: on
                                      ? item.corAcessorioExtra
                                      : '',
                                  })
                                }
                              }}
                            />
                            <span>{perguntaOptIn(slot)}</span>
                          </label>
                          {ligado ? (
                            <div className="lanc-opt-select">
                              <SearchableSelect
                                id={`extra-${slot}-${item.key}`}
                                value={valor}
                                placeholder={`Busque a ${rotuloTipoCor(slot).toLowerCase()}…`}
                                options={coresOptIn(slot).map((c) => ({
                                  value: c,
                                  label: c,
                                }))}
                                onChange={(cor) => {
                                  if (slot === 'PERFIL') {
                                    updateItem(item.key, {
                                      corPerfilExtra: cor,
                                    })
                                  } else if (slot === 'VIDRO') {
                                    updateItem(item.key, {
                                      corVidroExtra: cor,
                                    })
                                  } else {
                                    updateItem(item.key, {
                                      corAcessorioExtra: cor,
                                    })
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="btn-ghost lanc-opt-clear"
                                onClick={() => {
                                  if (slot === 'PERFIL') {
                                    updateItem(item.key, {
                                      informarPerfil: false,
                                      corPerfilExtra: '',
                                    })
                                  } else if (slot === 'VIDRO') {
                                    updateItem(item.key, {
                                      informarVidro: false,
                                      corVidroExtra: '',
                                    })
                                  } else {
                                    updateItem(item.key, {
                                      informarAcessorio: false,
                                      corAcessorioExtra: '',
                                    })
                                  }
                                }}
                              >
                                Não informar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )
                    },
                  )}
                </div>
              ) : null}

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
                void carregarTiposCusto()
              }}
            />
            Incluir gastos nestes itens (custos variáveis atrelados à venda e ao
            cliente)
          </label>

          {incluirGastos && (
            <fieldset className="lanc-fieldset soft">
              <legend>Gastos</legend>
              {gastos.map((g) => {
                const isOutros = g.tipoCusto.toUpperCase() === 'OUTROS'
                const linhasTipo = linhasCustoPorTipo[g.tipoCusto] ?? []
                const mostraLinha =
                  Boolean(g.tipoCusto) && !isOutros && linhasTipo.length > 1
                const itensCusto = custosDoGasto(g)
                return (
                <div key={g.key} className="lanc-gasto-block">
                  <div className="lanc-fields-row">
                    <div className="field">
                      <label>Item da venda</label>
                      <SearchableSelect
                        value={g.itemKey}
                        options={itens.map((i, idx) => ({
                          value: i.key,
                          label: `Item ${idx + 1}${i.linha ? ` · ${i.linha}` : ''}${i.produto ? ` · ${i.produto}` : ''}`,
                        }))}
                        onChange={(itemKey) =>
                          setGastos((prev) =>
                            prev.map((x) =>
                              x.key === g.key ? { ...x, itemKey } : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Tipo de custo</label>
                      <SearchableSelect
                        value={g.tipoCusto}
                        required={incluirGastos}
                        placeholder="Busque o tipo…"
                        options={tiposCusto.map((t) => ({ value: t, label: t }))}
                        onChange={(tipo) => void aplicarTipoNoGasto(g.key, tipo)}
                      />
                    </div>
                    {mostraLinha && (
                      <div className="field">
                        <label>Linha</label>
                        <SearchableSelect
                          value={g.linhaCusto}
                          required={incluirGastos}
                          placeholder="Busque a linha…"
                          options={linhasTipo.map((l) => ({ value: l, label: l }))}
                          onChange={(linha) => {
                            setGastos((prev) =>
                              prev.map((x) =>
                                x.key === g.key
                                  ? { ...x, linhaCusto: linha, idCusto: '' }
                                  : x,
                              ),
                            )
                            if (g.tipoCusto) void garantirCustosTipo(g.tipoCusto, linha)
                          }}
                        />
                      </div>
                    )}
                    <div className="field grow">
                      <label>Item</label>
                      {isOutros ? (
                        <input
                          value={g.itemLivre}
                          onChange={(e) =>
                            setGastos((prev) =>
                              prev.map((x) =>
                                x.key === g.key
                                  ? { ...x, itemLivre: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          placeholder="Digite o item"
                          required={incluirGastos}
                        />
                      ) : (
                        <SearchableSelect
                          value={g.idCusto}
                          required={incluirGastos}
                          disabled={
                            !g.tipoCusto ||
                            (linhasTipo.length > 1 && !g.linhaCusto)
                          }
                          placeholder={
                            !g.tipoCusto
                              ? 'Escolha o tipo'
                              : linhasTipo.length > 1 && !g.linhaCusto
                                ? 'Escolha a linha'
                                : 'Busque o item…'
                          }
                          options={itensCusto.map((c) => ({
                            value: String(c.idCusto),
                            label: c.rotulo,
                          }))}
                          onChange={(idCusto) =>
                            setGastos((prev) =>
                              prev.map((x) =>
                                x.key === g.key ? { ...x, idCusto } : x,
                              ),
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="lanc-fields-row compact">
                    <div className="field">
                      <label>Quantidade</label>
                      <input
                        inputMode="decimal"
                        value={g.quantidade}
                        onChange={(e) =>
                          setGastos((prev) =>
                            prev.map((x) =>
                              x.key === g.key
                                ? { ...x, quantidade: e.target.value }
                                : x,
                            ),
                          )
                        }
                        required={incluirGastos}
                      />
                    </div>
                    <div className="field">
                      <label>Valor unitário (R$)</label>
                      <input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={g.valorUnitario}
                        onChange={(e) =>
                          setGastos((prev) =>
                            prev.map((x) =>
                              x.key === g.key
                                ? { ...x, valorUnitario: e.target.value }
                                : x,
                            ),
                          )
                        }
                        required={incluirGastos}
                      />
                    </div>
                    <div className="field">
                      <label>Valor total</label>
                      <input
                        className="lanc-computed"
                        readOnly
                        tabIndex={-1}
                        value={money(totalGastoForm(g))}
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
                </div>
                )
              })}
              <button
                type="button"
                className="btn btn-ghost lanc-add-row"
                onClick={() => {
                  void carregarTiposCusto()
                  setGastos((prev) => [
                    ...prev,
                    emptyGasto(itens[0]?.key ?? ''),
                  ])
                }}
              >
                <Plus size={16} /> Adicionar gasto
              </button>
            </fieldset>
          )}

          <div className="lanc-form-footer">
            <div className="lanc-total-stack">
              {incluirGastos && gastos.length > 0 ? (
                <div className="lanc-custos">
                  Custos <strong>{money(totalCustos)}</strong>
                </div>
              ) : null}
              <div className="lanc-total">
                Total <strong>{money(total)}</strong>
              </div>
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

          {erro && !isErroRotaCoresCatalogo(erro) && (
            <p className="lanc-error">{erro}</p>
          )}
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
            {recebimentoParcial
              ? ' Esta venda tem sinal ou recebimento parcial — o saldo em aberto será ajustado ao novo total. Os valores já recebidos não mudam.'
              : jaRecebido
                ? ' Esta venda já foi recebida por completo — se o total aumentar, a diferença fica a receber. Não é possível reduzir abaixo do já recebido.'
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

    {confirmSinal && (
      <div className="df-drawer-backdrop" role="presentation">
        <div
          className="df-confirm df-confirm-wide glass"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="lanc-sinal-title"
        >
          <h3 id="lanc-sinal-title">Houve algum sinal de pagamento?</h3>
          <p>
            No fechamento do contrato, às vezes entra um sinal e o restante
            fica a receber. O total desta venda é{' '}
            <strong>{money(total)}</strong>.
          </p>
          {sinalModo === 'escolher' ? (
            <div className="df-confirm-stack">
              <button
                type="button"
                className="btn btn-accent"
                disabled={salvando}
                onClick={confirmarSemSinal}
              >
                {salvando ? (
                  <>
                    <Loader2 className="spin" size={16} /> Salvando…
                  </>
                ) : (
                  'Não, o valor fica completo'
                )}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={salvando}
                onClick={() => {
                  setSinalModo('sim')
                  setErroSinal(null)
                }}
              >
                Sim, houve sinal
              </button>
            </div>
          ) : (
            <>
              <div className="field" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="valor-sinal">Valor do sinal (R$)</label>
                <input
                  id="valor-sinal"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorSinalInput}
                  autoFocus
                  onChange={(e) => {
                    setValorSinalInput(e.target.value)
                    setErroSinal(null)
                  }}
                />
              </div>
              {(() => {
                const v = parseDecimal(valorSinalInput)
                const valido = v > 0 && v <= total + 0.001
                const pendente = valido
                  ? Math.round((total - v) * 100) / 100
                  : null
                if (pendente == null) return null
                return (
                  <p className="df-confirm-saldo">
                    {pendente > 0
                      ? `Ficará pendente ${money(pendente)}.`
                      : 'O sinal cobre o total — nada fica a receber.'}
                  </p>
                )
              })()}
              {erroSinal && <p className="lanc-error">{erroSinal}</p>}
              <div className="df-form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={salvando}
                  onClick={() => {
                    setSinalModo('escolher')
                    setValorSinalInput('')
                    setErroSinal(null)
                  }}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn btn-accent"
                  disabled={salvando}
                  onClick={confirmarComSinal}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="spin" size={16} /> Salvando…
                    </>
                  ) : (
                    'Confirmar venda'
                  )}
                </button>
              </div>
            </>
          )}
          {sinalModo === 'escolher' && (
            <div className="df-form-actions" style={{ marginTop: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={salvando}
                onClick={() => {
                  setConfirmSinal(false)
                  setPendingPayload(null)
                  setErroSinal(null)
                }}
              >
                Cancelar
              </button>
            </div>
          )}
          {sinalModo === 'escolher' && erroSinal && (
            <p className="lanc-error">{erroSinal}</p>
          )}
        </div>
      </div>
    )}

    {tourDemoSinal !== 'off' && (
      <div className="df-drawer-backdrop" role="presentation">
        <div
          className="df-confirm df-confirm-wide glass tour-demo-dialog"
          data-tour="sinal-demo"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="lanc-sinal-demo-title"
        >
          <p className="tour-demo-kicker">Demonstração</p>
          <h3 id="lanc-sinal-demo-title">Houve algum sinal de pagamento?</h3>
          <p>
            No fechamento do contrato, às vezes entra um sinal e o restante
            fica a receber. O total desta venda é{' '}
            <strong>{money(10000)}</strong>.
          </p>
          {tourDemoSinal === 'escolher' ? (
            <div className="df-confirm-stack">
              <button
                type="button"
                className="btn btn-accent"
                data-tour="sinal-demo-nao"
                tabIndex={-1}
              >
                Não, o valor fica completo
              </button>
              <button type="button" className="btn btn-ghost" tabIndex={-1}>
                Sim, houve sinal
              </button>
            </div>
          ) : (
            <>
              <div
                className="field"
                data-tour="sinal-demo-valor"
                style={{ marginBottom: '0.75rem' }}
              >
                <label htmlFor="valor-sinal-demo">Valor do sinal (R$)</label>
                <input
                  id="valor-sinal-demo"
                  readOnly
                  tabIndex={-1}
                  value="5.000,00"
                />
              </div>
              <p className="df-confirm-saldo">
                Ficará pendente {money(5000)}.
              </p>
            </>
          )}
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
      setErro(null)
      listarVendasLancamento(busca)
        .then((res) => {
          if (!alive) return
          setItens(res.itens)
          setErro(null)
        })
        .catch((e) => {
          if (!alive) return
          setErro(e instanceof Error ? e.message : 'Erro ao listar vendas')
        })
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

