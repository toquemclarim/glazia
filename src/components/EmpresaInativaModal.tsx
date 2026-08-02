import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import { whatsappAtivarEmpresaUrl } from '../lib/plan'

export function EmpresaInativaModal() {
  const { usuario, logout, empresaBloqueada } = useApp()

  if (!empresaBloqueada || !usuario || typeof document === 'undefined') {
    return null
  }

  const wa = whatsappAtivarEmpresaUrl({
    empresaNome: usuario.empresaNome,
    responsavel: usuario.nomeCompleto,
  })

  return createPortal(
    <div className="inactive-backdrop" role="presentation">
      <motion.div
        className="inactive-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inactive-title"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        <p className="inactive-kicker">Período de avaliação</p>
        <h2 id="inactive-title">Seu período de avaliação terminou.</h2>
        <p>
          Esperamos que nesses 14 dias você tenha percebido como é mais fácil
          administrar sua vidraçaria quando você sabe exatamente para onde o
          dinheiro está indo.
        </p>
        <p>
          Todos os seus dados continuam armazenados com segurança.
        </p>
        <p>
          Para continuar utilizando o Glazia, entre em contato conosco pelo
          WhatsApp e escolha o plano ideal para sua empresa.
        </p>

        <a
          className="btn btn-accent inactive-cta"
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} />
          Ativar minha empresa
        </a>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => logout()}
        >
          Voltar
        </button>
      </motion.div>
    </div>,
    document.body,
  )
}
