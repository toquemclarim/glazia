import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  X,
} from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { useTour } from '../tour/TourContext'
import type { TourPlacement } from '../tour/types'

type Rect = { top: number; left: number; width: number; height: number }

function measure(selector: string): Rect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  }
}

function placeTooltip(
  target: Rect,
  tipW: number,
  tipH: number,
  preferred: TourPlacement = 'auto',
) {
  const pad = 14
  const vw = window.innerWidth
  const vh = window.innerHeight

  const candidates: { place: TourPlacement; top: number; left: number }[] = [
    {
      place: 'bottom',
      top: target.top + target.height + pad,
      left: target.left + target.width / 2 - tipW / 2,
    },
    {
      place: 'top',
      top: target.top - tipH - pad,
      left: target.left + target.width / 2 - tipW / 2,
    },
    {
      place: 'right',
      top: target.top + target.height / 2 - tipH / 2,
      left: target.left + target.width + pad,
    },
    {
      place: 'left',
      top: target.top + target.height / 2 - tipH / 2,
      left: target.left - tipW - pad,
    },
  ]

  const order =
    preferred === 'auto'
      ? candidates
      : [
          ...candidates.filter((c) => c.place === preferred),
          ...candidates.filter((c) => c.place !== preferred),
        ]

  for (const c of order) {
    const left = Math.min(Math.max(12, c.left), vw - tipW - 12)
    const top = Math.min(Math.max(12, c.top), vh - tipH - 12)
    const fits =
      c.top >= 8 &&
      c.top + tipH <= vh - 8 &&
      c.left >= 8 &&
      c.left + tipW <= vw - 8
    if (fits || preferred !== 'auto') {
      return { top, left, place: c.place }
    }
  }

  return {
    top: Math.min(Math.max(12, target.top + target.height + pad), vh - tipH - 12),
    left: Math.min(Math.max(12, target.left), vw - tipW - 12),
    place: 'bottom' as TourPlacement,
  }
}

function Spotlight({
  rect,
  allowInteract,
}: {
  rect: Rect | null
  allowInteract?: boolean
}) {
  if (!rect) {
    return <div className="tour-overlay tour-overlay-full" aria-hidden="true" />
  }

  const pad = 8
  const style: CSSProperties = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }

  return (
    <>
      <div
        className={`tour-overlay${allowInteract ? ' pass-through' : ''}`}
        aria-hidden="true"
      />
      <div className="tour-spotlight" style={style} aria-hidden="true" />
    </>
  )
}

function TourPicker() {
  const {
    availableFlows,
    startFlow,
    startWelcomeTour,
    startSinalTour,
    closeTour,
  } = useTour()

  return (
    <div className="tour-picker-backdrop" role="dialog" aria-modal="true">
      <div className="tour-picker glass">
        <header className="tour-picker-head">
          <div>
            <p className="tour-picker-eyebrow">Ajuda guiada</p>
            <h2>Como podemos ajudar?</h2>
            <p>
              O guia mostra só o que o seu cargo e plano liberam. Escolha o
              tour completo ou um tópico específico.
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={closeTour}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <ul className="tour-picker-list">
          <li>
            <button
              type="button"
              className="tour-picker-option tour-picker-option-featured tour-picker-option-novelty"
              onClick={() => startSinalTour()}
            >
              <span className="tour-novelty">Novidade</span>
              <strong>Sinal e pagamentos parcelados</strong>
              <span>
                Como registrar a entrada no fechamento e acompanhar o que
                ainda falta receber — sem gravar nada, só uma volta na tela.
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="tour-picker-option tour-picker-option-featured"
              onClick={() => startWelcomeTour()}
            >
              <strong>Tour de primeiros passos</strong>
              <span>
                Visão geral automática do seu acesso — ideal no início ou para
                relembrar o fluxo.
              </span>
            </button>
          </li>
          {availableFlows.map((flow) => (
            <li key={flow.id}>
              <button
                type="button"
                className="tour-picker-option"
                onClick={() => startFlow(flow.id)}
              >
                <strong>{flow.question}</strong>
                <span>{flow.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TourRunner() {
  const {
    flow,
    step,
    stepIndex,
    totalSteps,
    nextStep,
    prevStep,
    closeTour,
  } = useTour()
  const [rect, setRect] = useState<Rect | null>(null)
  const [tipPos, setTipPos] = useState({ top: 80, left: 24 })
  const [missing, setMissing] = useState(false)

  useLayoutEffect(() => {
    if (!step) return
    let cancelled = false
    let tries = 0
    let activeEl: Element | null = null

    const clearTarget = () => {
      if (activeEl) {
        activeEl.classList.remove('tour-target-active')
        activeEl = null
      }
    }

    const update = () => {
      if (cancelled) return
      const el = document.querySelector(step.selector)
      const found = el ? measure(step.selector) : null
      if (found && el) {
        clearTarget()
        activeEl = el
        el.classList.add('tour-target-active')
        setRect(found)
        setMissing(false)
        if (found.top + found.height > window.innerHeight - 40 || found.top < 40) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }

        const tipW = Math.min(360, window.innerWidth - 24)
        const tipH = flow?.novelty ? 250 : 210
        const pos = placeTooltip(found, tipW, tipH, step.placement)
        setTipPos({ top: pos.top, left: pos.left })
      } else {
        clearTarget()
        setRect(null)
        tries += 1
        if (tries < 14) {
          window.setTimeout(update, 140)
        } else {
          setMissing(true)
          setTipPos({
            top: Math.max(24, window.innerHeight / 2 - 100),
            left: Math.max(12, window.innerWidth / 2 - 180),
          })
        }
      }
    }

    const t = window.setTimeout(update, 60)
    const onResize = () => update()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)

    return () => {
      cancelled = true
      clearTarget()
      window.clearTimeout(t)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [flow, step, stepIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTour()
      if (e.key === 'ArrowRight') nextStep()
      if (e.key === 'ArrowLeft') prevStep()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeTour, nextStep, prevStep])

  if (!flow || !step) return null

  const isLast = stepIndex >= totalSteps - 1

  return (
    <div className="tour-layer">
      <Spotlight rect={rect} allowInteract={step.allowInteract} />

      <div
        className="tour-tooltip glass"
        style={{ top: tipPos.top, left: tipPos.left }}
        role="dialog"
        aria-labelledby="tour-tip-title"
      >
        <div className="tour-tooltip-progress">
          <span className="tour-tooltip-kicker">
            {flow.novelty && <span className="tour-novelty">Novidade</span>}
            <span>
              Passo {stepIndex + 1} de {totalSteps}
            </span>
          </span>
          <button type="button" className="tour-skip" onClick={closeTour}>
            Pular tour
          </button>
        </div>

        <div className="tour-tooltip-dots" aria-hidden="true">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={`tour-dot${i === stepIndex ? ' active' : ''}${i < stepIndex ? ' done' : ''}`}
            />
          ))}
        </div>

        <h3 id="tour-tip-title">{step.title}</h3>
        <p>{step.body}</p>
        {missing && (
          <p className="tour-missing">
            Elemento ainda carregando — avance ou aguarde um instante.
          </p>
        )}

        <div className="tour-tooltip-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={prevStep}
            disabled={stepIndex === 0}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <button type="button" className="btn btn-accent" onClick={nextStep}>
            {isLast ? (
              'Concluir'
            ) : (
              <>
                Próximo <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function GuidedTour() {
  const { phase, openPicker, closeTour } = useTour()

  return (
    <>
      <button
        type="button"
        data-tour="tour-fab"
        className={`tour-fab${phase !== 'idle' ? ' active' : ''}`}
        onClick={() => (phase === 'idle' ? openPicker() : closeTour())}
        aria-label={phase === 'idle' ? 'Abrir ajuda guiada' : 'Fechar ajuda'}
        title={phase === 'idle' ? 'Ajuda guiada' : 'Fechar ajuda'}
      >
        {phase === 'idle' ? (
          <CircleHelp size={22} strokeWidth={2.25} />
        ) : (
          <X size={20} strokeWidth={2.25} />
        )}
      </button>

      {phase === 'picker' && createPortal(<TourPicker />, document.body)}
      {phase === 'running' && createPortal(<TourRunner />, document.body)}
    </>
  )
}
