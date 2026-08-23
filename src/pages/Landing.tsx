import { useEffect, useState, type ComponentType } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ClipboardList,
  Coins,
  FileSpreadsheet,
  Gauge,
  Info,
  Layers,
  Lock,
  MessageSquare,
  PenLine,
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { BrandLogo } from '../components/BrandLogo'
import { useApp } from '../context/AppContext'
import { PLAN_COPY } from '../lib/plan'
import './landing.css'

/** Reveal progressivo. Nunca zera a opacidade — se o observer falhar, o
 *  conteúdo continua legível. */
function useRevealOnScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('.lp [data-reveal]'),
    )
    if (reduce || nodes.length === 0) {
      nodes.forEach((n) => n.classList.add('is-revealed'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    nodes.forEach((n) => io.observe(n))
    /* fallback: se o IO falhar, revela tudo em 1.2s */
    const fallback = window.setTimeout(() => {
      nodes.forEach((n) => n.classList.add('is-revealed'))
    }, 1200)
    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [enabled])
}

/** Três pilares apresentados no fim do hero */
const HERO_CARDS = [
  {
    icon: BarChart3,
    title: 'Análise de Dados',
    body: 'KPIs e mix de produto com leitura clara para a oficina.',
  },
  {
    icon: FileSpreadsheet,
    title: 'DRE em Tempo Real',
    body: 'Faturamento, custos e lucro do mês sem planilha paralela.',
  },
  {
    icon: Coins,
    title: 'Fluxo de Caixa',
    body: 'O que entrou, o que falta receber e o que vence amanhã.',
  },
]

const BENEFICIOS = [
  {
    icon: Wallet,
    title: 'Resultado do mês sem planilha',
    body: 'Receita, custos e lucro lado a lado — o que sobrou de verdade.',
  },
  {
    icon: Receipt,
    title: 'Contas a pagar sob controle',
    body: 'Vencidas, próximas e o impacto no caixa antes do susto.',
  },
  {
    icon: Users,
    title: 'Clientes e obras',
    body: 'Quem mais fatura, quem atrasa e onde a margem some.',
  },
  {
    icon: Layers,
    title: 'Custos por linha',
    body: 'Vidro, alumínio, mão de obra e o que cada obra realmente consome.',
  },
  {
    icon: ClipboardList,
    title: 'Lançamentos rápidos',
    body: 'Entradas e saídas no ritmo da oficina, sem burocracia.',
  },
  {
    icon: MessageSquare,
    title: 'Pergunte em português',
    body: 'Chat que responde com os números da sua empresa.',
  },
]

const PASSOS: {
  n: string
  title: string
  body: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}[] = [
  {
    n: '01',
    title: 'Crie a conta',
    body: 'Cadastre a vidraçaria e o responsável em menos de 2 minutos.',
    icon: UserPlus,
  },
  {
    n: '02',
    title: 'Lance o mês',
    body: 'Receitas, despesas e obras — o essencial para enxergar o caixa.',
    icon: PenLine,
  },
  {
    n: '03',
    title: 'Decida com clareza',
    body: 'Painel, DRE e alertas mostram para onde o dinheiro está indo.',
    icon: Gauge,
  },
]

const FAQ = [
  {
    q: 'O trial é realmente gratuito?',
    a: 'Sim. 14 dias com recursos liberados, sem cartão de crédito. Ao final, seus dados ficam salvos para ativar um plano.',
  },
  {
    q: 'Serve para esquadrias também?',
    a: 'Sim. O Glazia foi pensado para vidraçarias e esquadrias: obras, custos de material e leitura de caixa do ramo.',
  },
  {
    q: 'Como ativo um plano depois do trial?',
    a: 'Pelo WhatsApp com a equipe Glazia. Basic, Standard ou Pro — você escolhe o que faz sentido para o tamanho da empresa.',
  },
  {
    q: 'Meus dados ficam misturados com outras empresas?',
    a: 'Não. Cada login enxerga só o tenant da sua empresa. Isolamento por empresa é regra do produto.',
  },
]

function LogoWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`lp-logo ${className}`}>
      <BrandLogo
        variant="full"
        size="nav"
        tone="light"
        className="lp-logo-img"
      />
    </span>
  )
}

function LogoMarkOnly({ className = '' }: { className?: string }) {
  return (
    <BrandLogo
      variant="mark"
      size="mark"
      tone="light"
      className={`lp-logo-g ${className}`}
    />
  )
}

/** Palco do hero: figura da marca + instrumentos de vidro com dados do painel. */
function HeroStage() {
  return (
    <div className="lp-stage" aria-hidden="true">
      <div className="lp-stage-light" />
      <div className="lp-stage-grid" />

      <div className="lp-inst lp-inst-kpi lp-float-a">
        <span className="lp-inst-label">Visão geral do mês</span>
        <strong>Receita total</strong>
        <em>+ R$ 5.808</em>
        <div className="lp-inst-bars">
          <i style={{ height: '78%' }} />
          <i style={{ height: '42%' }} />
          <i style={{ height: '58%' }} />
          <i style={{ height: '90%' }} />
        </div>
      </div>

      <div className="lp-inst lp-inst-cash lp-float-b">
        <span className="lp-inst-label">Fluxo de caixa</span>
        <strong>Projetado</strong>
        <div className="lp-inst-row">
          <span>Recebido</span>
          <b>R$ 12.4k</b>
        </div>
        <div className="lp-inst-row">
          <span>Em aberto</span>
          <b>R$ 3.1k</b>
        </div>
      </div>

      <div className="lp-inst lp-inst-mix lp-float-c">
        <span className="lp-inst-label">Custos por categoria</span>
        <div className="lp-inst-track">
          <span>Vidro</span>
          <i style={{ width: '86%' }} />
        </div>
        <div className="lp-inst-track">
          <span>Alumínio</span>
          <i style={{ width: '62%' }} />
        </div>
      </div>

      <figure className="lp-stage-figure">
        <img
          src="/hero-vidraceiro-clear.png"
          alt=""
          width={682}
          height={1024}
          loading="eager"
          decoding="async"
        />
      </figure>
    </div>
  )
}

export function Landing() {
  const { usuario, bootstrapping } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  useRevealOnScroll(!bootstrapping && !usuario)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Landing sempre legível, independente do tema do app */
  useEffect(() => {
    const root = document.documentElement
    const prev = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.add('lp-active')
    return () => {
      root.classList.remove('lp-active')
      if (prev) root.setAttribute('data-theme', prev)
      else root.removeAttribute('data-theme')
    }
  }, [])

  if (bootstrapping) return null
  if (usuario) return <Navigate to="/home" replace />

  return (
    <div className="lp lp-light">
      <div className="lp-atmosphere" aria-hidden="true" />
      <a className="lp-skip" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="#topo" className="lp-brand" aria-label="Glazia — início">
            <LogoWordmark />
          </a>
          <nav className="lp-nav-links" aria-label="Seções">
            <a href="#recursos" className="lp-nav-chip">
              Recursos
            </a>
            <a href="#planos" className="lp-nav-chip">
              Planos
            </a>
            <a href="#beneficios" className="lp-nav-chip">
              Benefícios
            </a>
            <a href="#assistente" className="lp-nav-chip">
              Assistente
            </a>
            <a href="#clientes" className="lp-nav-chip">
              Clientes
            </a>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-glass">
              Login
            </Link>
            <Link to="/criar-conta" className="lp-btn lp-btn-metal">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section id="topo" className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-hero-grid">
              <div className="lp-hero-copy lp-hero-in">
                <p className="lp-kicker">Feito para vidraçarias e esquadrias</p>
                <h1>
                  Descubra <span className="lp-hl">para onde o dinheiro</span>{' '}
                  da sua vidraçaria está indo.
                </h1>
                <p className="lp-hero-lead">
                  Controle financeiro simples e inteligente: resultado do mês,
                  caixa, custos e o que ainda falta pagar — tudo no mesmo lugar.
                </p>
                <div className="lp-hero-cta">
                  <Link
                    to="/criar-conta"
                    className="lp-btn lp-btn-metal lp-cta-main"
                  >
                    Criar conta gratuitamente
                    <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="lp-btn lp-btn-glass">
                    Entrar
                  </Link>
                </div>
                <p className="lp-micro">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Experimente gratuitamente durante 14 dias. Sem cartão de
                  crédito.
                </p>
                <aside
                  className="lp-session-chip lp-glass-panel"
                  aria-label="Prévia pós-login"
                >
                  <LogoMarkOnly />
                  <div>
                    <span className="lp-session-label">Sessão ativa</span>
                    <strong>Vidraçaria Alpha</strong>
                  </div>
                </aside>
              </div>

              <div
                className="lp-hero-visual lp-hero-in-delay"
                role="img"
                aria-label="Profissional de vidraçaria com tablet e painéis de KPIs do Glazia"
              >
                <HeroStage />
              </div>
            </div>

            <div className="lp-capabilities" id="beneficios">
              <div className="lp-capabilities-head" data-reveal>
                <p className="lp-kicker">Benefícios</p>
                <h2>Menos achismo. Mais decisão.</h2>
              </div>
              <ul>
                {HERO_CARDS.map((card, i) => (
                  <li
                    key={card.title}
                    className="lp-cap"
                    data-reveal
                    style={{ transitionDelay: `${i * 70}ms` }}
                  >
                    <span className="lp-cap-icon" aria-hidden="true">
                      <card.icon size={22} strokeWidth={1.75} />
                    </span>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-section lp-assistant" id="assistente" data-reveal>
          <div className="lp-assistant-shell lp-dark-panel">
            <div className="lp-assistant-copy">
              <p className="lp-kicker">Assistente Glazia</p>
              <h2>Você pergunta sobre as finanças. Ele responde.</h2>
              <p>
                Controle do financeiro onde você estiver — rápido e prático.
                Resumo do mês, produto mais rentável, o que vence: basta
                perguntar.
              </p>
              <ul className="lp-assistant-points">
                <li>Respostas com os números da sua empresa</li>
                <li>Atalhos prontos para o dia a dia</li>
                <li>Sem abrir planilha nem caçar relatório</li>
              </ul>
            </div>

            <figure className="lp-chat-mock">
              <figcaption className="lp-visually-hidden">
                Exemplo de conversa com o assistente Glazia
              </figcaption>
              <header className="lp-chat-head">
                <div className="lp-chat-head-brand">
                  <BrandLogo variant="mark" size="mark" tone="dark" />
                  <div>
                    <strong>Consulta rápida</strong>
                    <span>
                      <i /> Standard · atalhos · sua empresa
                    </span>
                  </div>
                </div>
              </header>

              <div className="lp-chat-thread">
                <div className="lp-chat-msg lp-chat-user">
                  <p>Resumo do mês</p>
                </div>
                <div className="lp-chat-msg lp-chat-bot">
                  <p>
                    <strong>Agosto 2026</strong> — mês lucrativo.
                  </p>
                  <ul>
                    <li>
                      Faturamento: <b>R$ 6.090,00</b>
                    </li>
                    <li>
                      Lucro operacional: <b>R$ 5.808,00</b>
                    </li>
                    <li>
                      A receber em aberto: <b>R$ 6.090,00</b>
                    </li>
                  </ul>
                </div>
                <div className="lp-chat-msg lp-chat-user">
                  <p>Mais rentável</p>
                </div>
                <div className="lp-chat-msg lp-chat-bot">
                  <p>
                    Produto mais rentável: <strong>JANELA MAXIM-AR</strong>
                  </p>
                  <ul>
                    <li>
                      Lucro: <b>R$ 3.118,00</b>
                    </li>
                    <li>
                      Linha: <b>SUPREMA</b>
                    </li>
                  </ul>
                  <p className="lp-chat-hint">
                    Sugestão: priorize orçamentos desse mix enquanto a margem
                    estiver boa.
                  </p>
                </div>
              </div>

              <footer className="lp-chat-foot">
                <span>Perguntar de novo</span>
                <div className="lp-chat-chips" aria-hidden="true">
                  <span>
                    <BarChart3 size={14} /> Resumo do mês
                  </span>
                  <span>
                    <TrendingUp size={14} /> Mais rentável
                  </span>
                  <span>
                    <Info size={14} /> O que pago
                  </span>
                </div>
              </footer>
            </figure>
          </div>
        </section>

        <section className="lp-section lp-gains" data-reveal>
          <div className="lp-gains-shell lp-solid-panel lp-lightline">
            <div className="lp-section-head">
              <p className="lp-kicker">Painel na oficina</p>
              <h2>Gráficos que mostram ganho de verdade</h2>
              <p>
                Fluxo, pizza de margem e barras de receita — flutuando sobre o
                dia a dia da vidraçaria.
              </p>
            </div>

            <div className="lp-gains-stage">
              <img
                className="lp-gains-photo"
                src="/lp-painel-oficina.jpg"
                alt="Profissional Glazia acompanhando o painel financeiro na oficina"
                width={1024}
                height={465}
                loading="lazy"
                decoding="async"
              />

              <div className="lp-gfloat lp-gfloat-bars lp-float-a">
                <span className="lp-inst-label">Receita do mês</span>
                <strong>+ R$ 48.200</strong>
                <div className="lp-inst-bars lp-gains-bars">
                  <i style={{ height: '55%' }} />
                  <i style={{ height: '72%' }} />
                  <i style={{ height: '48%' }} />
                  <i style={{ height: '88%' }} />
                  <i style={{ height: '96%' }} />
                </div>
              </div>

              <div className="lp-gfloat lp-gfloat-pie lp-float-b">
                <span className="lp-inst-label">Margem por linha</span>
                <div className="lp-pie" aria-hidden="true">
                  <span className="lp-pie-center">
                    <b>62%</b>
                    <small>margem</small>
                  </span>
                </div>
                <ul className="lp-pie-legend">
                  <li>
                    <i style={{ background: '#2d9f6f' }} /> Suprema
                  </li>
                  <li>
                    <i style={{ background: '#c9a06a' }} /> Gold
                  </li>
                  <li>
                    <i style={{ background: '#8a5e32' }} /> Outros
                  </li>
                </ul>
              </div>

              <div className="lp-gfloat lp-gfloat-gain lp-float-c">
                <span className="lp-inst-label">Lucro líquido</span>
                <strong className="lp-gain-up">+ 38%</strong>
                <p>vs. mês anterior · caixa no azul</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-benefits">
          <div className="lp-benefits-panel lp-solid-panel" data-reveal>
            <div className="lp-section-head">
              <p className="lp-kicker">Na prática</p>
              <h2>Tudo que a oficina precisa acompanhar</h2>
              <p>
                Dashboards flutuantes, DRE e fluxo de caixa — a mesma clareza
                do painel, no ritmo da vidraçaria.
              </p>
            </div>
            <ul className="lp-benefit-list">
              {BENEFICIOS.map((item, i) => (
                <li
                  key={item.title}
                  data-reveal
                  style={{ transitionDelay: `${i * 45}ms` }}
                >
                  <span className="lp-benefit-icon" aria-hidden="true">
                    <item.icon size={22} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="recursos" className="lp-section lp-how">
          <div className="lp-how-inner">
            <div className="lp-section-head" data-reveal>
              <p className="lp-kicker">Como funciona</p>
              <h2>Do cadastro ao painel em três passos</h2>
              <p>Comece em menos de 2 minutos. Veja o mês com clareza.</p>
            </div>
            <ol className="lp-steps">
              {PASSOS.map((p, i) => (
                <li
                  key={p.n}
                  data-reveal
                  style={{ transitionDelay: `${80 + i * 90}ms` }}
                >
                  <div className="lp-step-top">
                    <span className="lp-step-num" aria-hidden="true">
                      {p.n}
                    </span>
                    <span className="lp-step-icon" aria-hidden="true">
                      <p.icon size={22} strokeWidth={1.75} />
                    </span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                  {i < PASSOS.length - 1 && (
                    <span className="lp-step-rail" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lp-section lp-story">
          <div className="lp-story-copy" data-reveal>
            <p className="lp-kicker">Por que o Glazia</p>
            <h2>Feito para o ramo — não adaptado de um ERP genérico</h2>
            <p>
              Linguagem de vidraçaria, custos de obra, linhas de produto e o
              que o dono pergunta de verdade: “sobrou?” “quem me deve?” “o que
              vence?”
            </p>
            <div className="lp-diff">
              <div>
                <Lock size={20} aria-hidden="true" />
                <h3>Seus dados, sua empresa</h3>
                <p>
                  Cada login enxerga só o tenant da sua vidraçaria. Sem misturar
                  números de outro cliente.
                </p>
              </div>
              <div>
                <BarChart3 size={20} aria-hidden="true" />
                <h3>DRE e caixa lado a lado</h3>
                <p>
                  Venda no mês não é dinheiro na mão. O Glazia mostra as duas
                  leituras sem confundir.
                </p>
              </div>
              <div>
                <Wallet size={20} aria-hidden="true" />
                <h3>Tudo em um só lugar</h3>
                <p>
                  Lançamentos, clientes, despesas fixas, análise, exportação e
                  chat — sem planilha solta.
                </p>
              </div>
            </div>
          </div>
          <div className="lp-story-figure" data-reveal>
            <img
              src="/lp-vidraceira-clear.png"
              alt="Profissional apresentando o painel de receita trimestral no Glazia"
              width={682}
              height={1024}
              loading="lazy"
              decoding="async"
            />
          </div>
        </section>

        <section id="planos" className="lp-section lp-section-alt">
          <div className="lp-section-head" data-reveal>
            <p className="lp-kicker">Planos</p>
            <h2>Comece no Trial. Escala quando fizer sentido.</h2>
            <p>
              14 dias com recursos liberados. Depois, Basic, Standard ou Pro —
              ativação pelo WhatsApp.
            </p>
          </div>
          <div className="lp-plans" data-reveal>
            <article className="lp-plan lp-plan-featured">
              <p className="lp-plan-badge">Avaliação</p>
              <h3>Trial</h3>
              <p className="lp-plan-tag">14 dias · sem cartão</p>
              <ul>
                <li>Acesso completo ao período de teste</li>
                <li>Análise, custos, lançamentos e chat</li>
                <li>Seus dados ficam salvos ao final</li>
              </ul>
              <Link to="/criar-conta" className="lp-btn lp-btn-metal">
                Criar conta gratuitamente
              </Link>
            </article>
            {(['BASIC', 'STANDARD', 'PRO'] as const).map((key) => {
              const copy = PLAN_COPY[key]
              return (
                <article key={key} className="lp-plan">
                  <h3>{copy.titulo}</h3>
                  <p className="lp-plan-tag">{copy.tagline}</p>
                  <ul>
                    {copy.beneficios.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <a
                    className="lp-btn lp-btn-outline"
                    href="https://wa.me/5571986868421?text=Ol%C3%A1!%20Quero%20conhecer%20os%20planos%20do%20Glazia"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Falar no WhatsApp
                  </a>
                </article>
              )
            })}
          </div>
        </section>

        <section className="lp-section lp-quote-section">
          <div className="lp-quote lp-dark-panel" data-reveal>
            <p>
              “Pela primeira vez consegui olhar o mês e saber se a obra que
              mais faturou também foi a que mais lucrou.”
            </p>
            <span>Relato marcante do nosso primeiro cliente</span>
          </div>
        </section>

        <section className="lp-section lp-section-alt">
          <div className="lp-section-head">
            <p className="lp-kicker">Dúvidas</p>
            <h2>Perguntas frequentes</h2>
          </div>
          <div className="lp-faq">
            {FAQ.map((item, i) => {
              const open = faqOpen === i
              const panelId = `lp-faq-panel-${i}`
              return (
                <div key={item.q} className={`lp-faq-item${open ? ' open' : ''}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setFaqOpen(open ? null : i)}
                  >
                    {item.q}
                    <span className="lp-faq-sign" aria-hidden="true">
                      <ChevronDown size={16} strokeWidth={2.25} />
                    </span>
                  </button>
                  <p id={panelId} hidden={!open}>
                    {item.a}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section id="contato" className="lp-final">
          <div className="lp-final-copy" data-reveal>
            <div className="lp-final-trust">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>14 dias grátis · sem cartão · suporte no WhatsApp</span>
            </div>
            <h2>
              Veja exatamente para onde o dinheiro da sua empresa está indo.
            </h2>
            <p>
              Crie sua conta gratuitamente. Experimente durante 14 dias. Sem
              cartão de crédito.
            </p>
            <div className="lp-hero-cta">
              <Link
                to="/criar-conta"
                className="lp-btn lp-btn-metal lp-cta-main"
              >
                Criar conta gratuitamente
                <ArrowRight size={18} />
              </Link>
              <a
                className="lp-btn lp-btn-outline"
                href="https://wa.me/5571986868421?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20Glazia"
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
          <div className="lp-final-figure" data-reveal>
            <img
              src="/lp-vidraceiro-app-clear.png"
              alt="Profissional apresentando o aplicativo Glazia no celular"
              width={682}
              height={1024}
              loading="lazy"
              decoding="async"
            />
          </div>
        </section>

        <section className="lp-section lp-clients" id="clientes" data-reveal>
          <div className="lp-clients-shell lp-solid-panel lp-lightline">
            <div className="lp-clients-head">
              <p className="lp-kicker">Nossos clientes</p>
              <h2>Já tem vidraçaria no Glazia</h2>
              <p>
                Empresas reais do ramo já usam o painel para enxergar o mês com
                clareza — sem planilha solta.
              </p>
            </div>

            <article className="lp-client-card">
              <div className="lp-client-mark" aria-hidden="true">
                <img
                  src="/cliente-bobo.png"
                  alt=""
                  width={120}
                  height={120}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="lp-client-copy">
                <span className="lp-client-badge">Cliente ativo</span>
                <h3>Bobô Esquadrias</h3>
                <p>
                  Esquadrias e vidraçaria — gestão financeira no mesmo ritmo da
                  oficina.
                </p>
              </div>
              <div className="lp-client-glow" aria-hidden="true" />
            </article>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <LogoWordmark />
        <p>© {new Date().getFullYear()} Glazia. Controle financeiro para vidraçarias.</p>
        <div className="lp-footer-links">
          <Link to="/login">Entrar</Link>
          <Link to="/criar-conta">Criar conta</Link>
          <a
            href="https://wa.me/5571986868421"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </footer>
    </div>
  )
}
