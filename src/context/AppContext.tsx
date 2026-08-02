import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getAccessToken,
  loginApi,
  obterUsuario,
  setAccessToken,
  signupApi,
  type SignupPayload,
} from '../services/api'
import {
  entitlementsFor,
  type PlanEntitlements,
} from '../lib/plan'
import type { Cargo, Usuario } from '../types'

interface AppState {
  usuario: Usuario | null
  loading: boolean
  error: string | null
  bootstrapping: boolean
  login: (email: string, senha: string) => Promise<Usuario | null>
  signup: (payload: SignupPayload) => Promise<Usuario | null>
  /** Dono do SaaS — console /ops */
  isPlatform: boolean
  logout: () => void
  aplicarSessao: (accessToken: string, usuario: Usuario) => void
  navigateWithLoading: (navigate: () => void) => void
  /** Diretor e Sócio — análise financeira. */
  podeAnalisar: boolean
  /** ADM e Diretor — lançamentos e clientes. */
  podeOperar: boolean
  /** Só Diretor — despesas fixas, vencimentos e caixa. */
  podeGestaoFinanceira: boolean
  /** Só Diretor — usuários da empresa (Equipe). */
  podeGestaoEquipe: boolean
  /** Limites do plano da empresa. */
  plano: PlanEntitlements
  podeChat: boolean
  /** Digitação livre no chat — só Pro. */
  podeChatLivre: boolean
  podeExportar: boolean
  /** Empresa em trial / inativa (para banner e modal). */
  emTrial: boolean
  trialDiasRestantes: number | null
  empresaBloqueada: boolean
}

const AppContext = createContext<AppState | null>(null)

function cargoPermiteAnalise(cargo: Cargo) {
  return cargo === 'DIRETOR' || cargo === 'SOCIO'
}

function cargoPermiteOperar(cargo: Cargo) {
  return cargo === 'ADM' || cargo === 'DIRETOR' || cargo === 'VENDAS'
}

function cargoPermiteGestaoFinanceira(cargo: Cargo) {
  return cargo === 'DIRETOR'
}

function cargoPermiteGestaoEquipe(cargo: Cargo) {
  return cargo === 'DIRETOR'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const token = getAccessToken()
      if (!token) {
        if (active) setBootstrapping(false)
        return
      }

      try {
        const user = await obterUsuario()
        if (active) setUsuario(user)
      } catch {
        setAccessToken(null)
        if (active) setUsuario(null)
      } finally {
        if (active) setBootstrapping(false)
      }
    }

    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await loginApi(email, senha)
      setAccessToken(result.accessToken)
      setUsuario(result.usuario)
      return result.usuario
    } catch (cause) {
      setAccessToken(null)
      setUsuario(null)
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível entrar',
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (payload: SignupPayload) => {
    setLoading(true)
    setError(null)
    try {
      const result = await signupApi(payload)
      setAccessToken(result.accessToken)
      setUsuario(result.usuario)
      return result.usuario
    } catch (cause) {
      setAccessToken(null)
      setUsuario(null)
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível criar a conta',
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setAccessToken(null)
    setUsuario(null)
    setError(null)
  }, [])

  const aplicarSessao = useCallback((accessToken: string, user: Usuario) => {
    setAccessToken(accessToken)
    setUsuario(user)
  }, [])

  const navigateWithLoading = useCallback((navigate: () => void) => {
    setLoading(true)
    setTimeout(() => {
      navigate()
      setTimeout(() => setLoading(false), 450)
    }, 550)
  }, [])

  const value = useMemo(() => {
    const plano =
      usuario?.cargo === 'PLATFORM'
        ? entitlementsFor('PRO')
        : entitlementsFor(usuario?.plano)
    const status = usuario?.statusAssinatura
    return {
      usuario,
      loading: loading || bootstrapping,
      error,
      bootstrapping,
      login,
      signup,
      logout,
      aplicarSessao,
      navigateWithLoading,
      podeAnalisar: usuario ? cargoPermiteAnalise(usuario.cargo) : false,
      podeOperar: usuario ? cargoPermiteOperar(usuario.cargo) : false,
      podeGestaoFinanceira: usuario
        ? cargoPermiteGestaoFinanceira(usuario.cargo)
        : false,
      podeGestaoEquipe: usuario
        ? cargoPermiteGestaoEquipe(usuario.cargo)
        : false,
      isPlatform: usuario?.cargo === 'PLATFORM',
      plano,
      podeChat: plano.chat,
      podeChatLivre: plano.chatLivre,
      podeExportar: plano.export,
      emTrial: status === 'trial',
      trialDiasRestantes: usuario?.trialDiasRestantes ?? null,
      empresaBloqueada: Boolean(usuario?.empresaBloqueada),
    }
  }, [
    usuario,
    loading,
    bootstrapping,
    error,
    login,
    signup,
    logout,
    aplicarSessao,
    navigateWithLoading,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
