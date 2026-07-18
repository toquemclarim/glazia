import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { seedDespesas } from '../data/seed'
import {
  criarLancamento,
  excluirLancamento,
  listarLancamentos,
  obterCatalogos,
  obterUsuario,
  type Catalogos,
} from '../services/api'
import {
  isSupabaseConfigured,
  requireSupabase,
  supabase,
} from '../services/supabase'
import type { DespesaFixa, Lancamento, Usuario } from '../types'
import { uid } from '../utils/format'

interface AppState {
  usuario: Usuario | null
  lancamentos: Lancamento[]
  despesas: DespesaFixa[]
  catalogos: Catalogos | null
  loading: boolean
  error: string | null
  login: (email: string, senha: string) => Promise<boolean>
  logout: () => void
  navigateWithLoading: (navigate: () => void) => void
  addLancamento: (data: Omit<Lancamento, 'id'>) => Promise<void>
  removeLancamento: (id: string) => Promise<void>
  addDespesa: (data: Omit<DespesaFixa, 'id'>) => void
  updateDespesa: (id: string, data: Partial<DespesaFixa>) => void
  removeDespesa: (id: string) => void
}

const AppContext = createContext<AppState | null>(null)

const DESPESAS_STORAGE_KEY = 'glazia-despesas-demo-v1'

function loadDespesas(): DespesaFixa[] {
  try {
    const raw = localStorage.getItem(DESPESAS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DespesaFixa[]) : seedDespesas
  } catch {
    return seedDespesas
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [despesas, setDespesas] = useState<DespesaFixa[]>(loadDespesas)
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(DESPESAS_STORAGE_KEY, JSON.stringify(despesas))
  }, [despesas])

  const hydrateAuthenticatedState = useCallback(async () => {
    const [usuarioReal, lancamentosReais, catalogosReais] = await Promise.all([
      obterUsuario(),
      listarLancamentos(),
      obterCatalogos(),
    ])
    setUsuario(usuarioReal)
    setLancamentos(lancamentosReais)
    setCatalogos(catalogosReais)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let active = true
    setLoading(true)
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (active && data.session) {
          await hydrateAuthenticatedState()
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Falha ao restaurar a sessão',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUsuario(null)
        setLancamentos([])
        setCatalogos(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [hydrateAuthenticatedState])

  const login = useCallback(async (email: string, senha: string) => {
    setLoading(true)
    setError(null)
    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          'Supabase não configurado. Preencha o arquivo .env.local.',
        )
      }
      const client = requireSupabase()
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password: senha,
      })
      if (signInError) throw signInError
      await hydrateAuthenticatedState()
      return true
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível entrar',
      )
      return false
    } finally {
      setLoading(false)
    }
  }, [hydrateAuthenticatedState])

  const logout = useCallback(() => {
    setUsuario(null)
    setLancamentos([])
    setCatalogos(null)
    void supabase?.auth.signOut()
  }, [])

  const navigateWithLoading = useCallback((navigate: () => void) => {
    setLoading(true)
    setTimeout(() => {
      navigate()
      setTimeout(() => setLoading(false), 450)
    }, 550)
  }, [])

  const addLancamento = useCallback(
    async (data: Omit<Lancamento, 'id'>) => {
      setLoading(true)
      setError(null)
      try {
        const produto = catalogos?.produtos.find(
          (item) =>
            item.nome_produto === data.produto &&
            item.linha_produto === data.linha,
        ) ?? catalogos?.produtos.find(
          (item) => item.nome_produto === data.produto,
        )
        const plano = catalogos?.planoContas.find((item) =>
          data.tipo === 'entrada'
            ? item.tipo_conta === 'RECEITA'
            : item.tipo_conta === 'CUSTO',
        )
        const descricao = data.material
          ? `${data.descricao} — ${data.material}`
          : data.descricao
        const criado = await criarLancamento({
          tipo: data.tipo === 'entrada' ? 'ENTRADA' : 'SAIDA',
          clienteNome: data.cliente,
          idProduto: produto?.id,
          idPlanoContas: plano?.id,
          descricao,
          valor: data.valor.toFixed(2),
          dataLancamento: data.data,
          status: 'REALIZADO',
        })
        setLancamentos((prev) => [criado, ...prev])

        if (
          catalogos &&
          !catalogos.clientes.some(
            (cliente) =>
              cliente.nome.toLocaleLowerCase() ===
              data.cliente.toLocaleLowerCase(),
          )
        ) {
          setCatalogos(await obterCatalogos())
        }
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : 'Não foi possível criar o lançamento'
        setError(message)
        throw cause
      } finally {
        setLoading(false)
      }
    },
    [catalogos],
  )

  const removeLancamento = useCallback(async (id: string) => {
    setError(null)
    try {
      await excluirLancamento(id)
      setLancamentos((prev) => prev.filter((l) => l.id !== id))
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : 'Não foi possível excluir o lançamento'
      setError(message)
      throw cause
    }
  }, [])

  const addDespesa = useCallback((data: Omit<DespesaFixa, 'id'>) => {
    setDespesas((prev) => [{ ...data, id: uid() }, ...prev])
  }, [])

  const updateDespesa = useCallback((id: string, data: Partial<DespesaFixa>) => {
    setDespesas((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)))
  }, [])

  const removeDespesa = useCallback((id: string) => {
    setDespesas((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      usuario,
      lancamentos,
      despesas,
      catalogos,
      loading,
      error,
      login,
      logout,
      navigateWithLoading,
      addLancamento,
      removeLancamento,
      addDespesa,
      updateDespesa,
      removeDespesa,
    }),
    [
      usuario,
      lancamentos,
      despesas,
      catalogos,
      loading,
      error,
      login,
      logout,
      navigateWithLoading,
      addLancamento,
      removeLancamento,
      addDespesa,
      updateDespesa,
      removeDespesa,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
