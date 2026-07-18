import type { Lancamento, Usuario } from '../types'
import { requireSupabase } from './supabase'

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ??
  'http://localhost:3000/api/v1'

export interface CatalogoItem {
  id: string
}

export interface Catalogos {
  clientes: Array<CatalogoItem & { nome: string }>
  fornecedores: Array<CatalogoItem & { nome_fornecedor: string }>
  produtos: Array<
    CatalogoItem & {
      nome_produto: string
      linha_produto: string | null
      tipo_item: string
    }
  >
  projetos: Array<
    CatalogoItem & {
      nome_obra: string
      status: string
      id_cliente: string
    }
  >
  planoContas: Array<
    CatalogoItem & {
      tipo_conta: string
      categoria: string
      subcategoria: string | null
    }
  >
}

export interface CreateLancamentoInput {
  tipo: 'ENTRADA' | 'SAIDA'
  clienteNome: string
  idProduto?: string
  idPlanoContas?: string
  descricao: string
  valor: string
  dataLancamento: string
  status: 'REALIZADO'
}

interface ApiLancamento {
  id: string
  tipo: 'ENTRADA' | 'SAIDA'
  descricao: string
  valor: string | number
  data_lancamento: string
  clientes: { nome: string } | Array<{ nome: string }> | null
  produtos:
    | {
        nome_produto: string
        linha_produto: string | null
      }
    | Array<{
        nome_produto: string
        linha_produto: string | null
      }>
    | null
}

function relation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function mapLancamento(row: ApiLancamento): Lancamento {
  const cliente = relation(row.clientes)
  const produto = relation(row.produtos)

  return {
    id: row.id,
    tipo: row.tipo === 'ENTRADA' ? 'entrada' : 'saida',
    linha: (produto?.linha_produto ?? 'Sem linha') as Lancamento['linha'],
    produto: (produto?.nome_produto ?? 'Não informado') as Lancamento['produto'],
    cliente: cliente?.nome ?? 'Não informado',
    descricao: row.descricao,
    valor: Number(row.valor),
    data: row.data_lancamento,
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Entre novamente.')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[]
    } | null
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message
    throw new Error(message ?? `Erro HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function obterUsuario(): Promise<Usuario> {
  const data = await apiRequest<{
    email: string | null
    nomeCompleto: string | null
    empresaId: string
  }>('/me')

  return {
    nome: data.nomeCompleto ?? data.email?.split('@')[0] ?? 'Usuário',
    email: data.email ?? '',
    empresaId: data.empresaId,
  }
}

export async function obterCatalogos(): Promise<Catalogos> {
  return apiRequest<Catalogos>('/catalogos')
}

export async function listarLancamentos(): Promise<Lancamento[]> {
  const rows = await apiRequest<ApiLancamento[]>('/lancamentos?limite=200')
  return rows.map(mapLancamento)
}

export async function criarLancamento(
  input: CreateLancamentoInput,
): Promise<Lancamento> {
  const row = await apiRequest<ApiLancamento>('/lancamentos', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return mapLancamento(row)
}

export async function excluirLancamento(id: string): Promise<void> {
  await apiRequest<void>(`/lancamentos/${id}`, { method: 'DELETE' })
}
