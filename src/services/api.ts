import type {
  AtualizarClientePayload,
  AtualizarDespesaFixaPayload,
  CatalogoCustoItem,
  CatalogoLinhaItem,
  CatalogoCorItem,
  CatalogoProdutoItem,
  Cliente,
  ContaAVencer,
  ContasAPagar,
  CriarClientePayload,
  CriarCustoPayload,
  CriarDespesaFixaPayload,
  CriarUsuarioEquipePayload,
  CriarUsuarioEquipeResponse,
  CriarVendaPayload,
  CustoEstoqueDetalhe,
  CustoEstoqueResumo,
  AtualizarCustoEstoquePayload,
  CustosFixos,
  DespesaFixaCadastro,
  EmpresaPlatform,
  HistoricoPagamentoItem,
  PainelSocios,
  PlatformResumo,
  PlanoAssinatura,
  ProjecaoMetas,
  ProximoVencimento,
  QuantidadeProdutoResponse,
  Rentabilidade,
  ResultadoMensal,
  StatusAssinatura,
  Usuario,
  UsuarioEquipe,
  VendaDetalhe,
  VendaResumo,
  CalendarioVendas,
} from '../types'
import { coresDimPadrao } from '../utils/coresVenda'

// Em dev, IPv4 explícito — `localhost` pode ir para ::1 e a API só escuta em 0.0.0.0.
const rawApiUrl =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:3000/api/v1'
    : 'https://glazia-api-9yrb.onrender.com/api/v1')
const API_URL = import.meta.env.DEV
  ? rawApiUrl.replace(/\/\/localhost(?=[:/])/i, '//127.0.0.1')
  : rawApiUrl

/** Evita `/catalogo/cores/?x=` — Fastify trata a barra extra como outra rota. */
function joinApiUrl(path: string): string {
  const root = API_URL.replace(/\/+$/, '')
  const [rawPath, query] = path.split('?')
  const cleanPath = `/${(rawPath ?? '').replace(/^\/+|\/+$/g, '')}`
  return query ? `${root}${cleanPath}?${query}` : `${root}${cleanPath}`
}

export const TOKEN_STORAGE_KEY = 'glazia-jwt-token'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAccessToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    return
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  }

  // Nest rejeita Content-Type: application/json sem body.
  // Só envia o header quando há corpo na requisição.
  if (init.body != null && headers['Content-Type'] == null) {
    headers['Content-Type'] = 'application/json'
  }

  if (authenticated) {
    const token = getAccessToken()
    if (!token) {
      throw new Error('Sessão expirada. Entre novamente.')
    }
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(joinApiUrl(path), {
      ...init,
      headers,
    })
  } catch {
    throw new Error(
      'Não foi possível conectar à API. Verifique se o servidor está no ar.',
    )
  }

  if (!response.ok) {
    // Sessão revalidada no servidor: token inválido/usuário inativo → limpa local.
    if (authenticated && response.status === 401) {
      setAccessToken(null)
    }
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[]
      code?: string
    } | null
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message
    const detail = message ?? `Erro HTTP ${response.status}`
    const err = new Error(
      `${detail} [${response.status} ${response.url}]`,
    ) as Error & {
      code?: string
      status?: number
    }
    err.code = body?.code
    err.status = response.status
    throw err
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export interface LoginResponse {
  accessToken: string
  usuario: Usuario
}

export async function loginApi(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false,
  )
}

export type SignupPayload = {
  nomeFantasia: string
  razaoSocial?: string
  cnpj?: string
  nomeDiretor: string
  telefone: string
  emailContato: string
  emailLogin: string
  senha: string
  confirmarSenha: string
  aceitouTermos: boolean
}

export async function signupApi(payload: SignupPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    '/auth/signup',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    false,
  )
}

export async function obterUsuario(): Promise<Usuario> {
  return apiRequest<Usuario>('/auth/me')
}

function withMes(path: string, mes?: string) {
  if (!mes) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}mes=${encodeURIComponent(mes)}`
}

export async function obterResultado(mes?: string): Promise<ResultadoMensal> {
  return apiRequest<ResultadoMensal>(withMes('/analytics/resultado', mes))
}

export async function obterRentabilidade(mes?: string): Promise<Rentabilidade> {
  return apiRequest<Rentabilidade>(withMes('/analytics/rentabilidade', mes))
}

export async function obterCustosFixos(mes?: string): Promise<CustosFixos> {
  return apiRequest<CustosFixos>(withMes('/analytics/custos-fixos', mes))
}

export async function obterContasAVencer(
  mes?: string,
): Promise<{ mes: string; itens: ContaAVencer[] }> {
  return apiRequest(withMes('/analytics/contas-a-vencer', mes))
}

export async function obterContasAPagar(dias = 45): Promise<ContasAPagar> {
  return apiRequest<ContasAPagar>(`/analytics/contas-a-pagar?dias=${dias}`)
}

export async function obterProjecaoMetas(mes?: string): Promise<ProjecaoMetas> {
  return apiRequest<ProjecaoMetas>(withMes('/analytics/projecao-metas', mes))
}

export async function obterPainelSocios(mes?: string): Promise<PainelSocios> {
  return apiRequest<PainelSocios>(withMes('/analytics/painel-socios', mes))
}

export async function marcarContaRecebida(
  idTransacao: string,
  valorRecebido?: number,
) {
  return apiRequest<{
    idTransacao: string
    dataPagamento: string
    competencia: string
    valorRecebido: number
    valorPendente?: number
    mensagem: string
  }>(
    `/analytics/contas-a-receber/${encodeURIComponent(idTransacao)}/marcar-recebido`,
    {
      method: 'POST',
      body: JSON.stringify(
        valorRecebido != null ? { valorRecebido } : {},
      ),
    },
  )
}

export async function obterQuantidadeProduto(
  produto: string,
  mes?: string,
): Promise<QuantidadeProdutoResponse> {
  const base = `/analytics/quantidade-produto?produto=${encodeURIComponent(produto)}`
  return apiRequest<QuantidadeProdutoResponse>(withMes(base, mes))
}

export async function alterarSenhaConta(payload: {
  senhaAtual: string
  senhaNova: string
  confirmarSenha: string
}) {
  return apiRequest<{
    accessToken: string
    usuario: Usuario
    mensagem: string
  }>('/conta/senha', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function alterarEmailConta(payload: {
  novoEmail: string
  senhaAtual: string
}) {
  return apiRequest<{ accessToken: string; usuario: Usuario }>('/conta/email', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/* —— Platform Ops (dono do SaaS) —— */

export async function obterPlatformResumo() {
  return apiRequest<PlatformResumo>('/platform/resumo')
}

export async function listarPlatformEmpresas() {
  return apiRequest<EmpresaPlatform[]>('/platform/empresas')
}

export async function obterPlatformEmpresa(id: string) {
  return apiRequest<EmpresaPlatform>(
    `/platform/empresas/${encodeURIComponent(id)}`,
  )
}

export async function criarPlatformEmpresa(payload: {
  nomeFantasia: string
  cnpj?: string
  plano: PlanoAssinatura
  status: 'ativa' | 'trial'
  contatoNome?: string
  contatoEmail?: string
  contatoTelefone?: string
  observacao?: string
  diretorNome: string
  diretorEmail: string
  diretorSenhaTemporaria: string
  comCustosIniciais?: boolean
}) {
  return apiRequest<{
    empresa: EmpresaPlatform
    diretor: {
      idUser: string
      email: string
      nomeCompleto: string
      cargo: string
    }
    senhaTemporaria: string
    custosIniciais?: number
  }>('/platform/empresas', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function atualizarPlatformEmpresa(
  id: string,
  payload: Partial<{
    nomeFantasia: string
    cnpj: string
    plano: PlanoAssinatura
    contatoNome: string
    contatoEmail: string | null
    contatoTelefone: string | null
    observacao: string | null
  }>,
) {
  return apiRequest<EmpresaPlatform>(
    `/platform/empresas/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function alterarStatusPlatformEmpresa(
  id: string,
  status: StatusAssinatura,
) {
  return apiRequest<EmpresaPlatform>(
    `/platform/empresas/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  )
}

/* —— Equipe (DIRETOR — usuários da própria empresa) —— */

export async function listarEquipe(): Promise<UsuarioEquipe[]> {
  return apiRequest<UsuarioEquipe[]>('/equipe/usuarios')
}

export async function criarUsuarioEquipe(
  payload: CriarUsuarioEquipePayload,
): Promise<CriarUsuarioEquipeResponse> {
  return apiRequest<CriarUsuarioEquipeResponse>('/equipe/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function alterarAtivoUsuarioEquipe(
  idUser: string,
  ativo: boolean,
): Promise<UsuarioEquipe> {
  return apiRequest<UsuarioEquipe>(
    `/equipe/usuarios/${encodeURIComponent(idUser)}/ativo`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ativo }),
    },
  )
}

/* —— Catálogo (dt_catalogo — só opções do CRUD) —— */

export async function listarLinhasCatalogo() {
  return apiRequest<{
    itens: CatalogoLinhaItem[]
    cores?: Record<'PERFIL' | 'VIDRO' | 'ACESSORIO', string[]>
  }>('/catalogo/linhas')
}

export async function listarCoresCatalogo(aplicavelA?: string) {
  const fallback = (): { itens: CatalogoCorItem[] } => {
    const tipo = (aplicavelA ?? '').trim().toUpperCase()
    const padrao = coresDimPadrao()
    const list =
      tipo === 'PERFIL' || tipo === 'VIDRO' || tipo === 'ACESSORIO'
        ? padrao[tipo]
        : [...new Set([...padrao.PERFIL, ...padrao.VIDRO, ...padrao.ACESSORIO])]
    return { itens: list.map((codigo) => ({ codigo, nome: codigo })) }
  }
  try {
    const qs = new URLSearchParams()
    if (aplicavelA) qs.set('aplicavelA', aplicavelA)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const res = await apiRequest<{ itens: CatalogoCorItem[] }>(
      `/catalogo/cores${suffix}`,
    )
    if (res?.itens?.length) return res
    return fallback()
  } catch {
    return fallback()
  }
}

export async function listarLinhasCustoCatalogo(tipoCusto?: string) {
  const qs = tipoCusto
    ? `?${new URLSearchParams({ tipoCusto })}`
    : ''
  return apiRequest<{ itens: Array<{ linha: string; quantidade: number }> }>(
    `/catalogo/custos/linhas${qs}`,
  )
}

export async function listarProdutosCatalogo(params: {
  linha?: string
  produto?: string
  q?: string
} = {}) {
  const qs = new URLSearchParams()
  if (params.linha) qs.set('linha', params.linha)
  if (params.produto) qs.set('produto', params.produto)
  if (params.q) qs.set('q', params.q)
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiRequest<{
    produtosDisponiveis: string[]
    coresDisponiveis: string[]
    itens: CatalogoProdutoItem[]
  }>(`/catalogo/produtos${suffix}`)
}

export async function listarTiposCustoCatalogo() {
  return apiRequest<{ itens: Array<{ tipoCusto: string; quantidade: number }> }>(
    '/catalogo/tipos-custo',
  )
}

export async function listarCustosCatalogo(params: {
  tipoCusto?: string
  linha?: string
  q?: string
  idProduto?: string
} = {}) {
  const qs = new URLSearchParams()
  if (params.tipoCusto) qs.set('tipoCusto', params.tipoCusto)
  if (params.linha) qs.set('linha', params.linha)
  if (params.q) qs.set('q', params.q)
  if (params.idProduto) qs.set('idProduto', params.idProduto)
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiRequest<{ itens: CatalogoCustoItem[] }>(`/catalogo/custos${suffix}`)
}

/* —— Lançamentos → grava no dataset analytics —— */

export async function listarVendasLancamento(
  q?: string,
  opts?: { data?: string },
) {
  const qs = new URLSearchParams()
  if (q?.trim()) qs.set('q', q.trim())
  if (opts?.data) qs.set('data', opts.data)
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiRequest<{ itens: VendaResumo[] }>(`/lancamentos/vendas${suffix}`)
}

export async function calendarioVendasLancamento(mes: string) {
  return apiRequest<CalendarioVendas>(
    `/lancamentos/vendas/calendario?mes=${encodeURIComponent(mes)}`,
  )
}

export async function criarVendaLancamento(payload: CriarVendaPayload) {
  return apiRequest<{
    idVenda: string
    dataVenda: string
    dataPrevisaoRecebimento: string
    valorTotal: number
    qtdItens: number
    qtdGastos: number
    mensagem: string
  }>('/lancamentos/vendas', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function obterVendaLancamento(idVenda: string) {
  return apiRequest<VendaDetalhe>(
    `/lancamentos/vendas/${encodeURIComponent(idVenda)}`,
  )
}

export async function atualizarVendaLancamento(
  idVenda: string,
  payload: CriarVendaPayload,
) {
  return apiRequest<{
    idVenda: string
    dataVenda: string
    dataPrevisaoRecebimento: string
    valorTotal: number
    qtdItens: number
    qtdGastos: number
    mensagem: string
  }>(`/lancamentos/vendas/${encodeURIComponent(idVenda)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function excluirVendaLancamento(idVenda: string) {
  return apiRequest<{ idVenda: string; mensagem: string }>(
    `/lancamentos/vendas/${encodeURIComponent(idVenda)}`,
    { method: 'DELETE' },
  )
}

export async function criarCustoLancamento(payload: CriarCustoPayload) {
  return apiRequest<{
    idCusto: string
    associadoAVenda: boolean
    idVenda: string | null
    destino: string
    mensagem: string
  }>('/lancamentos/custos', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listarCustosEstoqueLancamento(opts?: {
  q?: string
  mes?: string
}) {
  const qs = new URLSearchParams()
  if (opts?.q?.trim()) qs.set('q', opts.q.trim())
  if (opts?.mes) qs.set('mes', opts.mes)
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiRequest<{ mes: string; itens: CustoEstoqueResumo[] }>(
    `/lancamentos/custos${suffix}`,
  )
}

export async function obterCustoEstoqueLancamento(idCusto: string) {
  return apiRequest<CustoEstoqueDetalhe>(
    `/lancamentos/custos/${encodeURIComponent(idCusto)}`,
  )
}

export async function atualizarCustoEstoqueLancamento(
  idCusto: string,
  payload: AtualizarCustoEstoquePayload,
) {
  return apiRequest<{
    idCusto: string
    quantidade: number
    valorUnitario: number
    valor: number
    mensagem: string
  }>(`/lancamentos/custos/${encodeURIComponent(idCusto)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function excluirCustoEstoqueLancamento(idCusto: string) {
  return apiRequest<{ idCusto: string; mensagem: string }>(
    `/lancamentos/custos/${encodeURIComponent(idCusto)}`,
    { method: 'DELETE' },
  )
}

/* —— Clientes —— */
export async function listarClientes(
  q?: string,
  opts?: { incluirInativos?: boolean; status?: 'ativos' | 'inativos' | 'todos' },
) {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  if (opts?.status) {
    params.set('status', opts.status)
  } else if (opts?.incluirInativos) {
    params.set('status', 'todos')
  }
  const suffix = params.toString() ? `?${params}` : ''
  return apiRequest<{ itens: Cliente[]; status?: string }>(`/clientes${suffix}`)
}

export async function obterCliente(id: string) {
  return apiRequest<Cliente>(`/clientes/${encodeURIComponent(id)}`)
}

export async function criarCliente(payload: CriarClientePayload) {
  return apiRequest<Cliente & { mensagem: string; matricula: string }>(
    '/clientes',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function atualizarCliente(
  id: string,
  payload: AtualizarClientePayload,
) {
  return apiRequest<Cliente & { mensagem: string }>(
    `/clientes/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function desativarCliente(id: string) {
  return apiRequest<{ id: string; mensagem: string }>(
    `/clientes/${encodeURIComponent(id)}/desativar`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function reativarCliente(id: string) {
  return apiRequest<{ id: string; mensagem: string }>(
    `/clientes/${encodeURIComponent(id)}/reativar`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

/* —— Despesas fixas —— */
export async function listarDespesasFixas() {
  return apiRequest<{
    itens: DespesaFixaCadastro[]
    totalMensal: number
    maiorCusto: DespesaFixaCadastro | null
  }>('/despesas-fixas')
}

export async function listarProximosVencimentos(dias = 5) {
  return apiRequest<{
    dias: number
    itens: ProximoVencimento[]
    total: number
  }>(`/despesas-fixas/proximos-vencimentos?dias=${dias}`)
}

export async function marcarDespesaPaga(id: string, idTransacao?: string) {
  return apiRequest<{
    idPagamento: string
    dataPagamento: string
    competencia: string
    valorPago: number
    mensagem: string
  }>(`/despesas-fixas/${encodeURIComponent(id)}/marcar-pago`, {
    method: 'POST',
    body: JSON.stringify(idTransacao ? { idTransacao } : {}),
  })
}

export async function historicoPagamentosDespesa(id: string) {
  return apiRequest<{
    despesa: DespesaFixaCadastro
    itens: HistoricoPagamentoItem[]
  }>(`/despesas-fixas/${encodeURIComponent(id)}/historico-pagamentos`)
}

export async function criarDespesaFixa(payload: CriarDespesaFixaPayload) {
  return apiRequest<DespesaFixaCadastro & { mensagem: string }>(
    '/despesas-fixas',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function atualizarDespesaFixa(
  id: string,
  payload: AtualizarDespesaFixaPayload,
) {
  return apiRequest<DespesaFixaCadastro & { mensagem: string }>(
    `/despesas-fixas/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function removerDespesaFixa(id: string) {
  return apiRequest<{ mensagem: string; id: string }>(
    `/despesas-fixas/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

