import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { dispatchTourAction } from './events'
import { flowAllowed, getTourFlow, TOUR_FLOWS } from './flows'
import {
  buildSinalFlow,
  markSinalTourCompleted,
  wasSinalTourCompleted,
} from './sinal'
import type { TourAction, TourFlow, TourFlowId, TourStep } from './types'
import {
  buildWelcomeFlow,
  markWelcomeCompleted,
  wasWelcomeCompleted,
} from './welcome'

type TourPhase = 'idle' | 'picker' | 'running'

type TourContextValue = {
  phase: TourPhase
  flow: TourFlow | null
  stepIndex: number
  step: TourStep | null
  availableFlows: TourFlow[]
  openPicker: () => void
  closeTour: () => void
  startFlow: (id: TourFlowId) => void
  startWelcomeTour: () => void
  startSinalTour: () => void
  /** Dispara o tour de boas-vindas uma vez por usuário (após 1º login). */
  maybeAutoStartWelcome: () => void
  /** Novidade de sinal/parcelas — uma vez, depois do welcome. */
  maybeAutoStartSinalTour: () => void
  nextStep: () => void
  prevStep: () => void
  totalSteps: number
}

const TourContext = createContext<TourContextValue | null>(null)

const DEMO_TOUR_ACTIONS: TourAction[] = [
  'open-sinal-demo',
  'sinal-demo-sim',
  'open-receber-demo',
  'receber-demo-menor',
]

async function prepareStep(step: TourStep, navigate: (path: string) => void) {
  if (step.route) {
    navigate(step.route)
    await new Promise((r) => setTimeout(r, 450))
  }
  if (step.actions?.length) {
    for (const action of step.actions) {
      dispatchTourAction(action)
    }
    const demo = step.actions.some((action) =>
      DEMO_TOUR_ACTIONS.includes(action),
    )
    await new Promise((r) => setTimeout(r, demo ? 500 : 350))
  } else {
    await new Promise((r) => setTimeout(r, 80))
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const {
    usuario,
    bootstrapping,
    podeOperar,
    podeAnalisar,
    podeGestaoFinanceira,
    podeGestaoEquipe,
    podeChat,
    podeExportar,
    plano,
  } = useApp()
  const [phase, setPhase] = useState<TourPhase>('idle')
  const [flowId, setFlowId] = useState<TourFlowId | null>(null)
  const [customFlow, setCustomFlow] = useState<TourFlow | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const welcomeAutoRef = useRef(false)
  const sinalAutoRef = useRef(false)

  const access = useMemo(
    () => ({
      podeOperar,
      podeAnalisar,
      podeGestaoFinanceira,
      podeGestaoEquipe,
      podeChat,
      podeExportar,
    }),
    [
      podeOperar,
      podeAnalisar,
      podeGestaoFinanceira,
      podeGestaoEquipe,
      podeChat,
      podeExportar,
    ],
  )

  const welcomeCtx = useMemo(
    () => ({
      cargo: usuario?.cargo ?? 'ADM',
      planoLabel: plano.label,
      ...access,
    }),
    [usuario?.cargo, plano.label, access],
  )

  const availableFlows = useMemo(
    () => TOUR_FLOWS.filter((f) => flowAllowed(f, access)),
    [access],
  )

  const flow =
    customFlow ?? (flowId ? (getTourFlow(flowId) ?? null) : null)
  const step = flow?.steps[stepIndex] ?? null
  const totalSteps = flow?.steps.length ?? 0

  const goNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate],
  )

  const openPicker = useCallback(() => {
    setPhase('picker')
    setFlowId(null)
    setCustomFlow(null)
    setStepIndex(0)
  }, [])

  const startSinalTour = useCallback(() => {
    if (!usuario || usuario.cargo === 'PLATFORM') return
    const sinal = buildSinalFlow(welcomeCtx)
    if (!sinal.steps.length) return
    setCustomFlow(sinal)
    setFlowId('sinal-parcelas')
    setStepIndex(0)
    setPhase('running')
    void prepareStep(sinal.steps[0], goNavigate)
  }, [goNavigate, usuario, welcomeCtx])

  const startWelcomeTour = useCallback(() => {
    if (!usuario || usuario.cargo === 'PLATFORM') return
    const welcome = buildWelcomeFlow(welcomeCtx)
    if (!welcome.steps.length) return
    setCustomFlow(welcome)
    setFlowId('boas-vindas')
    setStepIndex(0)
    setPhase('running')
    void prepareStep(welcome.steps[0], goNavigate)
  }, [goNavigate, usuario, welcomeCtx])

  const closeTour = useCallback(() => {
    const closingId = flowId
    if (closingId === 'boas-vindas' && usuario?.idUser) {
      markWelcomeCompleted(usuario.idUser)
    }
    if (closingId === 'sinal-parcelas' && usuario?.idUser) {
      markSinalTourCompleted(usuario.idUser)
    }
    setPhase('idle')
    setFlowId(null)
    setCustomFlow(null)
    setStepIndex(0)
    dispatchTourAction('close-sidebar')
    dispatchTourAction('reset-feature-demo')
    if (
      closingId === 'boas-vindas' &&
      usuario?.idUser &&
      usuario.cargo !== 'PLATFORM' &&
      !usuario.deveTrocarSenha &&
      !wasSinalTourCompleted(usuario.idUser)
    ) {
      sinalAutoRef.current = true
      window.setTimeout(() => {
        startSinalTour()
      }, 600)
    }
  }, [flowId, startSinalTour, usuario])

  const maybeAutoStartWelcome = useCallback(() => {
    if (bootstrapping || welcomeAutoRef.current) return
    if (!usuario || usuario.cargo === 'PLATFORM') return
    if (usuario.deveTrocarSenha) return
    if (wasWelcomeCompleted(usuario.idUser)) return
    welcomeAutoRef.current = true
    window.setTimeout(() => {
      startWelcomeTour()
    }, 700)
  }, [bootstrapping, startWelcomeTour, usuario])

  const maybeAutoStartSinalTour = useCallback(() => {
    if (bootstrapping || sinalAutoRef.current) return
    if (!usuario || usuario.cargo === 'PLATFORM') return
    if (usuario.deveTrocarSenha) return
    if (!wasWelcomeCompleted(usuario.idUser)) return
    if (wasSinalTourCompleted(usuario.idUser)) return
    sinalAutoRef.current = true
    window.setTimeout(() => {
      startSinalTour()
    }, 700)
  }, [bootstrapping, startSinalTour, usuario])

  const startFlow = useCallback(
    (id: TourFlowId) => {
      if (id === 'boas-vindas') {
        startWelcomeTour()
        return
      }
      if (id === 'sinal-parcelas') {
        startSinalTour()
        return
      }
      const next = getTourFlow(id)
      if (!next) return
      if (!flowAllowed(next, access)) return

      setCustomFlow(null)
      setFlowId(id)
      setStepIndex(0)
      setPhase('running')

      void prepareStep(next.steps[0], goNavigate)
    },
    [access, goNavigate, startSinalTour, startWelcomeTour],
  )

  const nextStep = useCallback(() => {
    if (!flow) return
    if (stepIndex >= flow.steps.length - 1) {
      closeTour()
      return
    }
    const nextIndex = stepIndex + 1
    setStepIndex(nextIndex)
    void prepareStep(flow.steps[nextIndex], goNavigate)
  }, [closeTour, flow, goNavigate, stepIndex])

  const prevStep = useCallback(() => {
    if (!flow || stepIndex <= 0) return
    const prevIndex = stepIndex - 1
    setStepIndex(prevIndex)
    void prepareStep(flow.steps[prevIndex], goNavigate)
  }, [flow, goNavigate, stepIndex])

  const value = useMemo(
    () => ({
      phase,
      flow,
      stepIndex,
      step,
      availableFlows,
      openPicker,
      closeTour,
      startFlow,
      startWelcomeTour,
      startSinalTour,
      maybeAutoStartWelcome,
      maybeAutoStartSinalTour,
      nextStep,
      prevStep,
      totalSteps,
    }),
    [
      phase,
      flow,
      stepIndex,
      step,
      availableFlows,
      openPicker,
      closeTour,
      startFlow,
      startWelcomeTour,
      startSinalTour,
      maybeAutoStartWelcome,
      maybeAutoStartSinalTour,
      nextStep,
      prevStep,
      totalSteps,
    ],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour deve ser usado dentro de TourProvider')
  return ctx
}
