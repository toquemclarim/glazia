import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Circle,
  Lock,
  PlusCircle,
  Receipt,
  ScanSearch,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClienteFormModal } from '../components/ClienteFormModal'
import { useApp } from '../context/AppContext'
import { useTour } from '../tour/TourContext'
import {
  listarClientes,
  listarDespesasFixas,
  listarProximosVencimentos,
  listarVendasLancamento,
} from '../services/api'
import type { Cargo, ProximoVencimento } from '../types'

const CARGO_LABEL: Record<Cargo, string> = {
  ADM: 'Operação · ADM',
  DIRETOR: 'Diretoria',
  SOCIO: 'Sócio',
  VENDAS: 'Vendas',
  PLATFORM: 'Platform Ops',
}

function saudacaoPorHora(hora: number) {
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDia(iso: string) {
  return iso.split('-').reverse().join('/')
}

const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function Home() {
  const {
    usuario,
    podeOperar,
    podeAnalisar,
    podeGestaoFinanceira,
    navigateWithLoading,
  } = useApp()
  const { startFlow, maybeAutoStartWelcome } = useTour()
  const navigate = useNavigate()
  const [agora, setAgora] = useState(() => new Date())
  const [modalCliente, setModalCliente] = useState(false)
  const [vencimentos, setVencimentos] = useState<ProximoVencimento[]>([])
  const [totalVenc, setTotalVenc] = useState(0)
  const [loadingVenc, setLoadingVenc] = useState(false)
  const [onboarding, setOnboarding] = useState<{
    clientes: boolean
    despesas: boolean
    vendas: boolean
  } | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (!usuario?.empresaId) return false
    return (
      localStorage.getItem(`glazia-onboarding-dismissed-${usuario.empresaId}`) ===
      '1'
    )
  })

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    maybeAutoStartWelcome()
  }, [maybeAutoStartWelcome])

  const carregarVencimentos = useCallback(async () => {
    if (!podeGestaoFinanceira) return
    setLoadingVenc(true)
    try {
      const res = await listarProximosVencimentos(5)
      setVencimentos(res.itens)
      setTotalVenc(res.total)
    } catch {
      setVencimentos([])
      setTotalVenc(0)
    } finally {
      setLoadingVenc(false)
    }
  }, [podeGestaoFinanceira])

  useEffect(() => {
    void carregarVencimentos()
  }, [carregarVencimentos])

  useEffect(() => {
    if (!usuario?.empresaId) return
    setOnboardingDismissed(
      localStorage.getItem(
        `glazia-onboarding-dismissed-${usuario.empresaId}`,
      ) === '1',
    )
  }, [usuario?.empresaId])

  useEffect(() => {
    let active = true
    async function loadOnboarding() {
      if (!podeOperar && !podeGestaoFinanceira) {
        if (active) setOnboarding(null)
        return
      }
      try {
        const [cli, desp, vendas] = await Promise.all([
          podeOperar
            ? listarClientes(undefined, { status: 'todos' })
            : Promise.resolve({ itens: [] as unknown[] }),
          podeGestaoFinanceira
            ? listarDespesasFixas()
            : Promise.resolve({ itens: [] as unknown[] }),
          podeOperar
            ? listarVendasLancamento()
            : Promise.resolve({ itens: [] as unknown[] }),
        ])
        if (!active) return
        setOnboarding({
          clientes: (cli.itens?.length ?? 0) > 0,
          despesas: (desp.itens?.length ?? 0) > 0,
          vendas: (vendas.itens?.length ?? 0) > 0,
        })
      } catch {
        if (active) setOnboarding(null)
      }
    }
    void loadOnboarding()
    return () => {
      active = false
    }
  }, [podeOperar, podeGestaoFinanceira])

  const primeiroNome = useMemo(() => {
    const base = usuario?.nomeCompleto || usuario?.nome || ''
    return base.trim().split(/\s+/)[0] || 'por aqui'
  }, [usuario])

  const atalhos = useMemo(
    () => [
      {
        path: '/lancamentos',
        titulo: 'Lançamentos',
        descricao: 'Registre vendas, itens, custos e retrabalhos do dia.',
        icon: PlusCircle,
        liberado: podeOperar,
      },
      {
        path: '/analise',
        titulo: 'Análise financeira',
        descricao: 'Resultado do mês, rentabilidade por item e por linha.',
        icon: BarChart3,
        liberado: podeAnalisar,
      },
      {
        path: '/analise-vendas',
        titulo: 'Análise de vendas',
        descricao: 'Pesquise ou escolha o dia e leia a margem de cada item.',
        icon: ScanSearch,
        liberado: podeAnalisar,
        novidade: true,
      },
      {
        path: '/despesas',
        titulo: 'Despesas fixas',
        descricao: 'Custos recorrentes, vigências e contas a vencer.',
        icon: Receipt,
        liberado: podeGestaoFinanceira,
      },
    ],
    [podeOperar, podeAnalisar, podeGestaoFinanceira],
  )

  const abrir = (path: string, liberado: boolean) => {
    if (!liberado) return
    navigateWithLoading(() => navigate(path))
  }

  const ultimoLogin = usuario?.ultimoLogin
    ? dataCurta.format(new Date(usuario.ultimoLogin))
    : null

  return (
    <div className="home">
      <section className="home-hero glass fade-up" data-tour="home-hero">
        <div className="home-hero-glow" aria-hidden="true" />
        <div className="home-panes" aria-hidden="true">
          <span className="home-pane pane-1" />
          <span className="home-pane pane-2" />
          <span className="home-pane pane-3" />
        </div>

        <div className="home-hero-content">
          <span className="home-eyebrow">
            <Sparkles size={14} />
            {saudacaoPorHora(agora.getHours())} · {dataLonga.format(agora)}
          </span>

          <h2 className="home-greeting">
            Olá, <span className="home-name">{primeiroNome}</span>
          </h2>
          <p className="home-question">Como vamos trabalhar hoje?</p>

          <div className="home-chips">
            {usuario?.cargo && (
              <span className="home-chip accent">
                {CARGO_LABEL[usuario.cargo]}
              </span>
            )}
            {usuario?.empresaId && (
              <span className="home-chip">Empresa {usuario.empresaId}</span>
            )}
            {ultimoLogin && (
              <span className="home-chip">Último acesso {ultimoLogin}</span>
            )}
          </div>
        </div>

        <div className="home-hero-art" aria-hidden="true">
          <div className="home-chart">
            <span className="home-bar bar-1" />
            <span className="home-bar bar-2" />
            <span className="home-bar bar-3" />
            <span className="home-bar bar-4" />
            <span className="home-bar bar-5" />
            <span className="home-chart-line" />
          </div>
        </div>
      </section>

      {onboarding &&
        !onboardingDismissed &&
        (!onboarding.clientes ||
          !onboarding.despesas ||
          !onboarding.vendas) && (
          <section className="home-onboard glass fade-up" data-tour="home-onboard">
            <header className="home-onboard-head">
              <div>
                <p className="section-title" style={{ marginBottom: 0 }}>
                  Primeiros passos
                </p>
                <h3>Coloque a empresa em operação</h3>
                <p>
                  Siga esta ordem para ver DRE e caixa funcionando de verdade.
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                aria-label="Dispensar checklist"
                onClick={() => {
                  if (usuario?.empresaId) {
                    localStorage.setItem(
                      `glazia-onboarding-dismissed-${usuario.empresaId}`,
                      '1',
                    )
                  }
                  setOnboardingDismissed(true)
                }}
              >
                <X size={16} />
              </button>
            </header>
            <ol className="home-onboard-steps">
              {[
                {
                  ok: onboarding.clientes,
                  title: 'Cadastrar um cliente',
                  body: 'Pode ser só o nome — matrícula sai automática.',
                  action: () => setModalCliente(true),
                  label: 'Novo cliente',
                  show: podeOperar,
                },
                {
                  ok: onboarding.despesas,
                  title: 'Conferir despesas fixas',
                  body: 'Se o Ops criou o seed, ajuste valores reais e marque Pago.',
                  action: () => abrir('/despesas', podeGestaoFinanceira),
                  label: 'Abrir despesas',
                  show: podeGestaoFinanceira,
                },
                {
                  ok: onboarding.vendas,
                  title: 'Lançar a primeira venda',
                  body: 'Escolha cliente, itens do catálogo e previsão de recebimento.',
                  action: () => abrir('/lancamentos', podeOperar),
                  label: 'Lançamentos',
                  show: podeOperar,
                },
                {
                  ok: false,
                  title: 'Marcar Recebido e ver DRE vs caixa',
                  body: 'Na Análise, o Recebido muda o caixa — o DRE usa a competência da venda.',
                  action: () => {
                    if (podeAnalisar) startFlow('primeiro-ciclo')
                    else abrir('/analise', podeAnalisar)
                  },
                  label: podeAnalisar ? 'Iniciar tour' : 'Análise',
                  show: podeAnalisar || podeGestaoFinanceira,
                },
              ]
                .filter((s) => s.show)
                .map((step) => (
                  <li key={step.title} className={step.ok ? 'done' : undefined}>
                    <span className="home-onboard-icon">
                      {step.ok ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Circle size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.body}</p>
                    </div>
                    {!step.ok && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={step.action}
                      >
                        {step.label}
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </li>
                ))}
            </ol>
          </section>
        )}

      {podeGestaoFinanceira && (
        <section className="home-vencimentos glass fade-up">
          <header className="home-venc-head">
            <div>
              <h3>
                <CalendarClock size={18} /> Contas a pagar
              </h3>
              <p>
                Vencidas em aberto e parcelas dos próximos 5 dias. Marque como
                pago em Despesas fixas para sumir daqui.
              </p>
            </div>
            {totalVenc > 0 && (
              <strong className="home-venc-total">
                {formatCurrency(totalVenc)}
              </strong>
            )}
          </header>

          {loadingVenc ? (
            <p className="home-venc-empty">Carregando vencimentos…</p>
          ) : vencimentos.length === 0 ? (
            <p className="home-venc-empty">
              Nenhuma conta vencida ou a vencer nos próximos 5 dias.
            </p>
          ) : (
            <ul className="home-venc-list">
              {vencimentos.map((item) => (
                <li key={item.idTransacao}>
                  <div>
                    <strong>{item.descricao}</strong>
                    <span>
                      {item.vencida
                        ? `Vencida em ${formatDia(item.dataVencimento)}`
                        : `Vence em ${formatDia(item.dataVencimento)}`}
                    </span>
                  </div>
                  <em>{formatCurrency(item.valor)}</em>
                </li>
              ))}
            </ul>
          )}

          {podeGestaoFinanceira && (
            <button
              type="button"
              className="btn btn-ghost home-venc-cta"
              onClick={() => abrir('/despesas', true)}
            >
              Gerenciar pagamentos
              <ArrowRight size={16} />
            </button>
          )}
        </section>
      )}

      <p className="section-title fade-up fade-up-delay-1">Atalhos rápidos</p>

      <div className="home-shortcuts">
        {podeOperar && (
          <button
            type="button"
            className="home-card glass fade-up"
            style={{ animationDelay: '0.08s' }}
            onClick={() => setModalCliente(true)}
          >
            <span className="home-card-shine" aria-hidden="true" />
            <span className="home-card-icon">
              <UserPlus size={22} />
            </span>
            <span className="home-card-text">
              <strong>Novo cliente</strong>
              <span>
                Cadastre PF ou PJ com matrícula automática de 8 dígitos.
              </span>
            </span>
            <span className="home-card-cta">
              <ArrowRight size={18} />
            </span>
          </button>
        )}

        {atalhos.map(
          ({ path, titulo, descricao, icon: Icon, liberado, novidade }, i) => (
          <button
            key={path}
            type="button"
            className={`home-card glass fade-up${liberado ? '' : ' locked'}`}
            style={{ animationDelay: `${0.12 + i * 0.08}s` }}
            onClick={() => abrir(path, liberado)}
            disabled={!liberado}
            aria-disabled={!liberado}
          >
            <span className="home-card-shine" aria-hidden="true" />
            <span className="home-card-icon">
              <Icon size={22} />
            </span>
            <span className="home-card-text">
              <strong>
                {titulo}
                {novidade && <span className="nav-new">Novidade</span>}
              </strong>
              <span>
                {liberado
                  ? descricao
                  : path === '/analise' || path === '/analise-vendas'
                    ? 'Disponível para Diretor e Sócio.'
                    : path === '/despesas'
                      ? 'Disponível para Diretor.'
                      : 'Disponível para ADM e Diretor.'}
              </span>
            </span>
            <span className="home-card-cta">
              {liberado ? <ArrowRight size={18} /> : <Lock size={16} />}
            </span>
          </button>
        ))}
      </div>

      <p className="home-footnote fade-up fade-up-delay-3">
        Tudo o que você lança aqui vira análise em tempo real — leve, clara e
        pronta para a próxima reunião.
      </p>

      <ClienteFormModal
        open={modalCliente}
        onClose={() => setModalCliente(false)}
        onSaved={() => undefined}
      />
    </div>
  )
}
