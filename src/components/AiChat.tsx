import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  BarChart3,
  Lock,
  MessageCircle,
  RefreshCw,
  Scale,
  Send,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { useDraggableFab } from '../hooks/useDraggableFab'
import { obterContasAPagar, obterPainelSocios } from '../services/api'
import {
  answerContasAPagar,
  answerFromPainel,
  detectChatIntent,
  resolveMesFromText,
  type ChatIntentId,
} from '../utils/chatIntent'
import { PlanUpsellModal } from './PlanUpsellModal'

interface Message {
  id: string
  role: 'bot' | 'user'
  text: string
}

type PromptId = 'resumo' | 'produto_top' | 'custos_fixos' | 'a_pagar' | 'meta'

const PROMPTS: Array<{
  id: PromptId
  label: string
  hint: string
  icon: typeof BarChart3
}> = [
  {
    id: 'resumo',
    label: 'Resumo do mês',
    hint: 'Faturamento, custos e lucro',
    icon: BarChart3,
  },
  {
    id: 'produto_top',
    label: 'Mais rentável',
    hint: 'Produto com maior lucro',
    icon: TrendingUp,
  },
  {
    id: 'a_pagar',
    label: 'O que pagar?',
    hint: 'Vencidas e próximos boletos',
    icon: AlertCircle,
  },
  {
    id: 'custos_fixos',
    label: 'Custos fixos',
    hint: 'Valores e vencimentos',
    icon: Wallet,
  },
  {
    id: 'meta',
    label: 'Meta e equilíbrio',
    hint: 'Projeção e ponto de equilíbrio',
    icon: Scale,
  },
]

const WELCOME_STANDARD =
  'Olá! Consulto só os números da sua empresa.\n\nToque em uma pergunta abaixo — no Standard o chat usa atalhos.'

const WELCOME_PRO =
  'Olá! Consulto só os números da sua empresa (nunca de outro cliente).\n\nDigite uma pergunta de negócio ou use os atalhos. Ex.: “quanto faturei?”, “o que tenho que pagar?”, “quem me deve?”, “mês passado”.'

function MessageBody({ text }: { text: string }) {
  const lines = text.split('\n')
  const hasBullets = lines.some((line) => line.startsWith('• '))

  if (!hasBullets) {
    return (
      <>
        {lines
          .filter((line) => line.length > 0)
          .map((line, i) => (
            <p key={`${line}-${i}`} className="ai-chat-line">
              {line}
            </p>
          ))}
      </>
    )
  }

  return (
    <>
      {lines.map((line, i) => {
        if (!line) return <br key={`br-${i}`} />
        if (line.startsWith('• ')) {
          return (
            <p key={`${line}-${i}`} className="ai-chat-line bullet">
              <span aria-hidden>•</span>
              {line.slice(2)}
            </p>
          )
        }
        return (
          <p key={`${line}-${i}`} className="ai-chat-line">
            {line}
          </p>
        )
      })}
    </>
  )
}

function TypingDots() {
  return (
    <div className="ai-chat-bubble bot typing" aria-label="Consultando dados">
      <span />
      <span />
      <span />
    </div>
  )
}

function ChatFab({
  open,
  locked,
  onToggle,
}: {
  open: boolean
  locked?: boolean
  onToggle: () => void
}) {
  const { style, dragging, fabProps, shouldIgnoreClick } = useDraggableFab()

  return (
    <button
      type="button"
      data-tour="chat-fab"
      className={`ai-chat-fab${open ? ' open' : ''}${locked ? ' ai-chat-fab-locked' : ''}${dragging ? ' is-dragging' : ''}`}
      style={style}
      {...fabProps}
      onClick={() => {
        if (shouldIgnoreClick()) return
        onToggle()
      }}
      aria-label={
        locked
          ? 'Chat disponível no Standard e Pro'
          : open
            ? 'Fechar consulta rápida'
            : 'Abrir consulta rápida'
      }
      aria-expanded={locked ? undefined : open}
      title={
        locked
          ? 'Disponível no Standard e Pro — arraste para mover'
          : 'Arraste para mover'
      }
    >
      {locked && (
        <span className="ai-chat-fab-lock" aria-hidden>
          <Lock size={12} />
        </span>
      )}
      {open && !locked ? <X size={22} /> : <MessageCircle size={22} />}
      {!open && !dragging && (
        <span className="ai-chat-fab-pulse" aria-hidden />
      )}
    </button>
  )
}

export function AiChat() {
  const { usuario, podeChat, podeChatLivre } = useApp()
  const titleId = useId()
  const welcome = podeChatLivre ? WELCOME_PRO : WELCOME_STANDARD
  const [open, setOpen] = useState(false)
  const [upsell, setUpsell] = useState(false)
  const [upsellFeature, setUpsellFeature] = useState<'chat' | 'chatLivre'>(
    'chat',
  )
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'bot', text: WELCOME_STANDARD },
  ])
  const [typing, setTyping] = useState(false)
  const [activePrompt, setActivePrompt] = useState<PromptId | null>(null)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMessages([{ id: `welcome-${Date.now()}`, role: 'bot', text: welcome }])
  }, [welcome])

  useEffect(() => {
    if (!open) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!usuario) return null

  if (!podeChat) {
    return (
      <>
        <ChatFab
          locked
          open={false}
          onToggle={() => {
            setUpsellFeature('chat')
            setUpsell(true)
          }}
        />
        <PlanUpsellModal
          open={upsell}
          feature={upsellFeature}
          planoAtual={usuario.plano}
          onClose={() => setUpsell(false)}
        />
      </>
    )
  }

  /** Sempre via JWT da sessão → dados só da empresa logada. */
  const consultar = async (intent: ChatIntentId, mes?: string) => {
    if (intent === 'a_pagar') {
      const contas = await obterContasAPagar(45)
      return answerContasAPagar(contas)
    }
    const painel = await obterPainelSocios(mes)
    return answerFromPainel(intent, painel)
  }

  const askPrompt = async (promptId: PromptId) => {
    if (typing) return
    const prompt = PROMPTS.find((p) => p.id === promptId)
    if (!prompt) return

    setActivePrompt(promptId)
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: prompt.label },
    ])
    setTyping(true)

    try {
      const text = await consultar(promptId)
      setMessages((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, role: 'bot', text },
      ])
    } catch (cause) {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text:
            cause instanceof Error
              ? cause.message
              : 'Não consegui consultar os dados agora. Tente de novo em instantes.',
        },
      ])
    } finally {
      setTyping(false)
      setActivePrompt(null)
    }
  }

  const askFreeText = async (raw: string) => {
    if (typing) return
    const pergunta = raw.trim()
    if (!pergunta) return

    if (!podeChatLivre) {
      setUpsellFeature('chatLivre')
      setUpsell(true)
      return
    }

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: pergunta },
    ])
    setDraft('')
    setTyping(true)

    try {
      const { intent } = detectChatIntent(pergunta)
      const mes = resolveMesFromText(pergunta)
      const text = await consultar(intent, mes)
      setMessages((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, role: 'bot', text },
      ])
    } catch (cause) {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text:
            cause instanceof Error
              ? cause.message
              : 'Não consegui consultar os dados agora. Tente de novo em instantes.',
        },
      ])
    } finally {
      setTyping(false)
      inputRef.current?.focus()
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void askFreeText(draft)
  }

  const reiniciar = () => {
    if (typing) return
    setMessages([{ id: `welcome-${Date.now()}`, role: 'bot', text: welcome }])
    setActivePrompt(null)
    setDraft('')
  }

  const soWelcome = messages.length === 1 && messages[0]?.role === 'bot'

  return (
    <div className={`ai-chat-root${open ? ' is-open' : ''}`}>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            key="ai-backdrop"
            className="ai-chat-backdrop"
            aria-label="Fechar consulta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="ai-panel"
            className="ai-chat-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="ai-chat-handle" aria-hidden />

            <header className="ai-chat-header">
              <div className="ai-chat-header-brand">
                <img src="/logo-mark-clear.png" alt="" className="ai-chat-avatar" />
                <div>
                  <strong id={titleId}>Consulta rápida</strong>
                  <span className="ai-chat-status">
                    <span className="ai-chat-status-dot" aria-hidden />
                    {podeChatLivre
                      ? 'Pro · dados só da sua empresa'
                      : 'Standard · atalhos · sua empresa'}
                  </span>
                </div>
              </div>
              <div className="ai-chat-header-actions">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={reiniciar}
                  disabled={typing || soWelcome}
                  aria-label="Nova consulta"
                  title="Nova consulta"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  ref={closeBtnRef}
                  type="button"
                  className="btn-icon"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="ai-chat-messages" role="log" aria-live="polite">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`ai-chat-row ${message.role}`}
                >
                  {message.role === 'bot' && (
                    <img
                      src="/logo-mark-clear.png"
                      alt=""
                      className="ai-chat-bubble-avatar"
                    />
                  )}
                  <div className={`ai-chat-bubble ${message.role}`}>
                    <MessageBody text={message.text} />
                  </div>
                </div>
              ))}
              {typing && (
                <div className="ai-chat-row bot">
                  <img
                    src="/logo-mark-clear.png"
                    alt=""
                    className="ai-chat-bubble-avatar"
                  />
                  <TypingDots />
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="ai-chat-prompts">
              <p className="ai-chat-prompts-label">
                {soWelcome ? 'Atalhos' : 'Perguntar de novo'}
              </p>
              <div
                className={`ai-chat-prompts-list${soWelcome ? ' is-cards' : ''}`}
              >
                {PROMPTS.map((prompt) => {
                  const Icon = prompt.icon
                  const busy = typing && activePrompt === prompt.id
                  return (
                    <button
                      key={prompt.id}
                      type="button"
                      className={`ai-chat-prompt-btn${soWelcome ? ' is-card' : ''}`}
                      onClick={() => void askPrompt(prompt.id)}
                      disabled={typing}
                      aria-busy={busy || undefined}
                    >
                      <Icon size={soWelcome ? 18 : 14} aria-hidden />
                      <span className="ai-chat-prompt-text">
                        <span className="ai-chat-prompt-label">
                          {prompt.label}
                        </span>
                        {soWelcome && (
                          <span className="ai-chat-prompt-hint">
                            {prompt.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {podeChatLivre ? (
              <form className="ai-chat-composer" onSubmit={onSubmit}>
                <label className="sr-only" htmlFor="ai-chat-input">
                  Digite sua pergunta
                </label>
                <input
                  ref={inputRef}
                  id="ai-chat-input"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ex.: quanto faturei? quem me deve?"
                  disabled={typing}
                  autoComplete="off"
                  maxLength={280}
                />
                <button
                  type="submit"
                  className="btn btn-accent ai-chat-send"
                  disabled={typing || !draft.trim()}
                  aria-label="Enviar pergunta"
                >
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="ai-chat-upgrade-hint"
                onClick={() => {
                  setUpsellFeature('chatLivre')
                  setUpsell(true)
                }}
              >
                <Lock size={14} />
                Digitar perguntas livres é exclusivo do Pro
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ChatFab open={open} onToggle={() => setOpen((v) => !v)} />

      <PlanUpsellModal
        open={upsell}
        feature={upsellFeature}
        planoAtual={usuario.plano}
        onClose={() => setUpsell(false)}
      />
    </div>
  )
}
