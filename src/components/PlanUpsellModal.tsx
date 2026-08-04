import { AnimatePresence, motion } from 'framer-motion'
import { Check, MessageCircle, Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  PLAN_COPY,
  WHATSAPP_UPGRADE_URL,
  entitlementsFor,
  type UpsellFeature,
} from '../lib/plan'
import type { PlanoAssinatura } from '../types'

const FEATURE_HEADLINE: Record<UpsellFeature, string> = {
  chat: 'Consultas rápidas no chat',
  chatLivre: 'Chat com perguntas digitadas',
  export: 'Exportar PDF e Excel',
  usuarios: 'Mais usuários na equipe',
}

const FEATURE_SUB: Record<UpsellFeature, string> = {
  chat: 'Pergunte o resumo do mês, produto mais rentável e custos — sem abrir relatório.',
  chatLivre:
    'No Pro você digita “quanto faturei?”, “quem me deve?”, “lucro por linha” e recebe a resposta com os dados da sua empresa.',
  export: 'Leve o painel dos sócios para reunião ou contabilidade em um clique.',
  usuarios: 'Convide ADM, Vendas ou Sócio e trabalhem juntos no mesmo Glazia.',
}

type Props = {
  open: boolean
  feature: UpsellFeature
  planoAtual?: string | null
  onClose: () => void
}

type PlanoPago = Exclude<PlanoAssinatura, 'TRIAL'>

function PlanCard({
  plano,
  highlight,
}: {
  plano: PlanoPago
  highlight?: boolean
}) {
  const copy = PLAN_COPY[plano]
  return (
    <div
      className={`upsell-plan-card${highlight ? ' is-highlight' : ''}`}
    >
      <div className="upsell-plan-badge">
        {highlight ? '★ Recomendado · ' : ''}
        {copy.titulo}
      </div>
      <p className="upsell-plan-tag">{copy.tagline}</p>
      <ul>
        {copy.beneficios.map((b: string) => (
          <li key={b}>
            <Check size={16} strokeWidth={2.5} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PlanUpsellModal({
  open,
  feature,
  planoAtual,
  onClose,
}: Props) {
  const atual = entitlementsFor(planoAtual)
  const whatsHref = WHATSAPP_UPGRADE_URL

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="upsell-backdrop"
          role="presentation"
          onClick={onClose}
        >
          <motion.div
            className="upsell-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upsell-title"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn-icon upsell-close"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <p className="upsell-kicker">
              <Sparkles size={14} />
              Seu plano: {atual.label}
            </p>
            <h2 id="upsell-title">{FEATURE_HEADLINE[feature]}</h2>
            <p className="upsell-sub">{FEATURE_SUB[feature]}</p>

            <div className="upsell-plans">
              <PlanCard plano="STANDARD" />
              <PlanCard plano="PRO" highlight />
            </div>

            <a
              className="btn btn-accent upsell-cta"
              href={whatsHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} />
              Falar no WhatsApp e mudar de plano
            </a>
            <p className="upsell-wa-hint">
              71 9 8686-8421 · mensagem pronta: “Olá! Gostaria de mudar meu
              plano Glazia”
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
