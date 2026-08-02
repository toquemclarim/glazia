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
import type { TourFlow, TourFlowId, TourStep } from './types'
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
  /** Dispara o tour de boas-vindas uma vez por usuário (após 1º login). */
  maybeAutoStartWelcome: () => void
  nextStep: () => void
  prevStep: () => void
  totalSteps: number
}

const TourContext = createContext<TourContextValue | null>(null)

async function prepareStep(step: TourStep, navigate: (path: string) => void) {
  if (step.route) {
    navigate(step.route)
    await new Promise((r) => setTimeout(r, 450))
  }
  if (step.actions?.length) {
    for (const action of step.actions) {
      dispatchTourAction(action)
    }
    await new Promise((r) => setTimeout(r, 350))
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
  const autoStartedRef = useRef(false)

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

  const closeTour = useCallback(() => {
    if (flowId === 'boas-vindas' && usuario?.idUser) {
      markWelcomeCompleted(usuario.idUser)
    }
    setPhase('idle')
    setFlowId(null)
    setCustomFlow(null)
    setStepIndex(0)
    dispatchTourAction('close-sidebar')
  }, [flowId, usuario?.idUser])

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

  const maybeAutoStartWelcome = useCallback(() => {
    if (bootstrapping || autoStartedRef.current) return
    if (!usuario || usuario.cargo === 'PLATFORM') return
    if (usuario.deveTrocarSenha) return
    if (wasWelcomeCompleted(usuario.idUser)) return
    autoStartedRef.current = true
    window.setTimeout(() => {
      startWelcomeTour()
    }, 700)
  }, [bootstrapping, startWelcomeTour, usuario])

  const startFlow = useCallback(
    (id: TourFlowId) => {
      if (id === 'boas-vindas') {
        startWelcomeTour()
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
    [access, goNavigate, startWelcomeTour],
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
      maybeAutoStartWelcome,
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
      maybeAutoStartWelcome,
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
