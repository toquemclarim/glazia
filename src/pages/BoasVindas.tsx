import { ArrowRight, ClipboardList, LineChart, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useApp } from '../context/AppContext'
import { clearQueuedWelcome, markWelcomeSeen } from '../utils/welcome'
import './boasVindas.css'

const PASSOS = [
  {
    icon: ClipboardList,
    title: 'Lance o que entra e o que sai',
    body: 'Comece pelos lançamentos do mês. Em poucos minutos o painel já faz sentido.',
  },
  {
    icon: Wallet,
    title: 'Veja o que vence',
    body: 'Contas a pagar e o caixa ficam visíveis — sem surpresa no fim do mês.',
  },
  {
    icon: LineChart,
    title: 'Entenda o resultado',
    body: 'A análise mostra para onde o dinheiro está indo e o que sobrou de verdade.',
  },
]

export function BoasVindas() {
  const { usuario } = useApp()
  const navigate = useNavigate()
  const primeiroNome = usuario?.nome?.trim().split(/\s+/)[0] || 'bem-vindo'

  const irParaHome = () => {
    if (usuario?.id) markWelcomeSeen(usuario.id)
    else clearQueuedWelcome()
    navigate('/home', { replace: true })
  }

  return (
    <div className="welcome-page">
      <div className="welcome-glow" aria-hidden="true" />

      <main className="welcome-shell">
        <header className="welcome-brand">
          <BrandLogo variant="full" size="nav" />
        </header>

        <p className="welcome-kicker">Conta pronta</p>
        <h1>
          Bem-vindo{primeiroNome !== 'bem-vindo' ? `, ${primeiroNome}` : ''}.
        </h1>
        <p className="welcome-lead">
          Sua vidraçaria já está no Glazia. Nos próximos minutos, o foco é um
          só: clareza sobre o dinheiro da empresa.
        </p>

        <ol className="welcome-steps">
          {PASSOS.map((passo, i) => (
            <li key={passo.title} style={{ animationDelay: `${120 + i * 90}ms` }}>
              <span className="welcome-step-num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="welcome-step-icon" aria-hidden="true">
                <passo.icon size={20} strokeWidth={1.75} />
              </span>
              <div>
                <h2>{passo.title}</h2>
                <p>{passo.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="welcome-actions">
          <button type="button" className="btn btn-accent welcome-cta" onClick={irParaHome}>
            Ir para o painel
            <ArrowRight size={18} />
          </button>
          <p className="welcome-micro">
            Trial de 14 dias · sem cartão · você pode explorar com calma
          </p>
        </div>
      </main>
    </div>
  )
}
