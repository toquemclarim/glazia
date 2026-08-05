import { useEffect, useState, type ComponentType } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Gauge,
  Layers,
  Lock,
  MessageSquare,
  PenLine,
  Receipt,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { BrandLogo } from '../components/BrandLogo'
import { useApp } from '../context/AppContext'
import { PLAN_COPY } from '../lib/plan'
import './landing.css'

/** Anima só o deslocamento — nunca opacity:0 (evita tela “vazia”). */
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

function LogoMark({
  className = '',
  size = 'nav',
}: {
  className?: string
  size?: 'nav' | 'hero'
}) {
  return (
    <span className={`lp-logo ${className}`}>
      <BrandLogo
        variant="full"
        size={size}
        tone="light"
        className="lp-logo-img"
      />
    </span>
  )
}

function HeroHoloStage() {
  return (
    <div className="lp-hero-stage" aria-hidden="true">
      <div className="lp-hero-glow lp-hero-glow-a" />
      <div className="lp-hero-glow lp-hero-glow-b" />
      <div className="lp-hero-particles" />

      <div className="lp-holo lp-holo-kpi lp-holo-float-a">
        <span className="lp-holo-label">Visão do mês</span>
        <strong>Mês rentável</strong>
        <em>+ R$ 5.808</em>
        <div className="lp-holo-bars">
          <i style={{ height: '78%' }} />
          <i style={{ height: '42%' }} />
          <i style={{ height: '58%' }} />
          <i style={{ height: '90%' }} />
        </div>
      </div>

      <div className="lp-holo lp-holo-cash lp-holo-float-b">
        <span className="lp-holo-label">Fluxo de caixa</span>
        <strong>Caixa no azul</strong>
        <div className="lp-holo-row">
          <span>Recebido</span>
          <b>R$ 12.4k</b>
        </div>
        <div className="lp-holo-row">
          <span>Em aberto</span>
          <b>R$ 3.1k</b>
        </div>
      </div>

      <div className="lp-holo lp-holo-mix lp-holo-float-c">
        <span className="lp-holo-label">Lucro por linha</span>
        <div className="lp-holo-chip">
          <span>SUPREMA</span>
          <i style={{ width: '86%' }} />
        </div>
        <div className="lp-holo-chip">
          <span>GOLD</span>
          <i style={{ width: '62%' }} />
        </div>
      </div>

      <div className="lp-hero-figure">
        <img
          src="/hero-vidraceiro-clear.png"
          alt=""
          width={682}
          height={1024}
          loading="eager"
          decoding="async"
        />
        <div className="lp-hero-tablet-glow" />
      </div>
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
      <a className="lp-skip" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="#topo" className="lp-brand" aria-label="Glazia — início">
            <LogoMark />
          </a>
          <nav className="lp-nav-links" aria-label="Seções">
            <a href="#recursos">Recursos</a>
            <a href="#beneficios">Benefícios</a>
            <a href="#planos">Planos</a>
            <a href="#contato">Contato</a>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-ghost">
              Entrar
            </Link>
            <Link to="/criar-conta" className="lp-btn lp-btn-metal">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section id="topo" className="lp-hero">
          <div className="lp-hero-atmosphere" aria-hidden="true" />
          <div className="lp-hero-grid">
            <div className="lp-hero-copy lp-hero-in">
              <p className="lp-kicker">Feito para vidraçarias e esquadrias</p>
              <LogoMark className="lp-logo-hero" size="hero" />
              <h1>
                Descubra para onde o dinheiro da sua vidraçaria está indo.
              </h1>
              <p className="lp-hero-lead">
                Controle financeiro simples e inteligente: resultado do mês,
                caixa, custos e o que ainda falta pagar — tudo no mesmo lugar.
              </p>
              <div className="lp-hero-cta">
                <Link to="/criar-conta" className="lp-btn lp-btn-metal lp-cta-main">
                  Criar conta gratuitamente
                  <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="lp-btn lp-btn-glass">
                  Entrar
                </Link>
              </div>
              <p className="lp-micro">
                Experimente gratuitamente durante 14 dias. Sem cartão de
                crédito.
              </p>
            </div>

            <div
              className="lp-hero-visual lp-hero-in-delay"
              role="img"
              aria-label="Profissional de vidraçaria com tablet e painéis holográficos de KPIs do Glazia"
            >
              <HeroHoloStage />
            </div>
          </div>
        </section>

        <section id="beneficios" className="lp-section lp-benefits">
          <div className="lp-benefits-panel" data-reveal>
            <div className="lp-section-head">
              <p className="lp-kicker">Benefícios</p>
              <h2>Menos achismo. Mais decisão.</h2>
              <p>
                Painéis holográficos de KPIs, dashboards flutuantes e gráficos
                de fluxo de caixa — a mesma clareza do painel, na operação do
                dia a dia.
              </p>
            </div>
            <ul className="lp-benefit-list">
              {BENEFICIOS.map((item, i) => (
                <li
                  key={item.title}
                  data-reveal
                  style={{ transitionDelay: `${i * 45}ms` }}
                >
                  <span className="lp-benefit-icon">
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
                <Lock size={20} />
                <h3>Seus dados, sua empresa</h3>
                <p>
                  Cada login enxerga só o tenant da sua vidraçaria. Sem misturar
                  números de outro cliente.
                </p>
              </div>
              <div>
                <BarChart3 size={20} />
                <h3>DRE e caixa lado a lado</h3>
                <p>
                  Venda no mês não é dinheiro na mão. O Glazia mostra as duas
                  leituras sem confundir.
                </p>
              </div>
              <div>
                <Wallet size={20} />
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
              <Link to="/criar-conta" className="btn btn-accent">
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
                    className="btn btn-ghost"
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

        <section className="lp-section">
          <div className="lp-quote" data-reveal>
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
              return (
                <div key={item.q} className={`lp-faq-item${open ? ' open' : ''}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setFaqOpen(open ? null : i)}
                  >
                    {item.q}
                    <span aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p>{item.a}</p>}
                </div>
              )
            })}
          </div>
        </section>

        <section id="contato" className="lp-final">
          <div className="lp-final-copy" data-reveal>
            <div className="lp-final-trust">
              <ShieldCheck size={18} />
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
              <Link to="/criar-conta" className="btn btn-accent lp-cta-main">
                Criar conta gratuitamente
                <ArrowRight size={18} />
              </Link>
              <a
                className="btn btn-ghost"
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
      </main>

      <footer className="lp-footer">
        <LogoMark />
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
