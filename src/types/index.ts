export type Cargo = 'ADM' | 'DIRETOR' | 'SOCIO' | 'VENDAS' | 'PLATFORM'

/** Cargos que o Diretor pode criar na Equipe. */
export type CargoConvidavel = 'ADM' | 'SOCIO' | 'VENDAS'

export type PlanoAssinatura = 'TRIAL' | 'BASIC' | 'STANDARD' | 'PRO'
export type StatusAssinatura =
  | 'ativa'
  | 'trial'
  | 'inativa'
  | 'suspensa'
  | 'cancelada'

export interface EmpresaPlatform {
  idEmpresa: string
  nomeFantasia: string
  cnpj: string | null
  plano: PlanoAssinatura | string
  status: StatusAssinatura
  dataOnboarding: string | null
  contatoNome: string | null
  contatoEmail: string | null
  contatoTelefone: string | null
  observacao: string | null
  usuariosTotal: number
  usuariosAtivos: number
  ultimoLogin: string | null
  criadoEm: string | null
  alteradoEm: string | null
}

export interface PlatformResumo {
  totalEmpresas: number
  ativas: number
  trial: number
  suspensas: number
  canceladas: number
  usuariosAtivos: number
}

export interface Usuario {
  id: string
  idUser: string
  nome: string
  nomeCompleto: string
  email: string
  empresaId: string
  cargo: Cargo
  dataNascimento: string | null
  ultimoLogin: string | null
  /** Plano da empresa (TRIAL | BASIC | STANDARD | PRO). */
  plano: PlanoAssinatura | string
  /** TRUE = bloquear app até trocar a senha temporária. */
  deveTrocarSenha?: boolean
  statusAssinatura?: StatusAssinatura | string
  empresaNome?: string | null
  trialInicio?: string | null
  trialFim?: string | null
  trialDiasRestantes?: number | null
  /** Empresa inativa/suspensa/cancelada — autentica, mas não opera. */
  empresaBloqueada?: boolean
}

export interface UsuarioEquipe {
  idUser: string
  email: string
  nomeCompleto: string
  cargo: Cargo
  dataNascimento: string | null
  ativo: boolean
  criadoEm: string
  alteradoEm: string | null
}

export interface CriarUsuarioEquipePayload {
  email: string
  nomeCompleto: string
  cargo: CargoConvidavel
  senhaTemporaria: string
  dataNascimento?: string
}

export interface CriarUsuarioEquipeResponse {
  usuario: UsuarioEquipe
  senhaTemporaria: string
}

export interface ResultadoMensal {
  mes: string
  faturamento: number
  custosVariaveis: number
  /** Parte dos variáveis ligada a vendas. */
  custosVariaveisVenda?: number
  /** Parte dos variáveis de estoque (sem venda). */
  custosVariaveisEstoque?: number
  custosFixos: number
  margemContribuicao: number
  margemPercentual: number
  lucroOperacional: number
  lucrativo: boolean
  deficitario: boolean
  /** Lista compacta de custos de estoque do mês (Análise). */
  custosEstoqueMes?: CustoEstoqueResumo[]
}

export interface CustoEstoqueResumo {
  idCusto: string
  dataCusto: string
  tipoCusto: string | null
  linha: string | null
  descricao: string
  quantidade: number
  valorUnitario: number
  valor: number
  idCustoCatalogo?: number
  rotulo?: string
}

export interface CustoEstoqueDetalhe extends CustoEstoqueResumo {
  associadoAVenda: boolean
  idVenda: string | null
}

export interface AtualizarCustoEstoquePayload {
  quantidade: number
  valorUnitario: number
  valor?: number
  descricao?: string
}

export interface ItemRentabilidade {
  produto: string
  linha: string | null
  receita: number
  custo: number
  lucro: number
  quantidade?: number
  qtdVendas: number
}

export interface ItemRentabilidadeCliente {
  idCliente: string
  cliente: string
  receita: number
  custo: number
  lucro: number
  qtdVendas: number
}

export interface MixCorSlot {
  slot: 'PERFIL' | 'VIDRO' | 'ACESSORIO'
  cor: string
  receita: number
  quantidade: number
  qtdItens: number
}

export interface MixCorTipo {
  tipo: 'PERFIL' | 'VIDRO' | 'ACESSORIO'
  receita: number
  quantidade: number
  qtdItens: number
}

export interface Rentabilidade {
  mes: string
  porProduto: ItemRentabilidade[]
  porLinha: Array<{
    linha: string
    receita: number
    custo: number
    lucro: number
  }>
  porCliente?: ItemRentabilidadeCliente[]
  mixPorTipo?: MixCorTipo[]
  mixPorSlot?: MixCorSlot[]
  maisRentavel: ItemRentabilidade | null
  menosRentavel: ItemRentabilidade | null
}

export interface CustoFixoItem {
  categoria: string | null
  subcategoria: string | null
  dataVencimento: string
  dataPagamento: string | null
  valorPrevisto: number
  valorRealizado: number | null
  status: string
  tipo: string
}

export interface CustosFixos {
  mes: string
  totalPrevisto: number
  totalMensalVigente?: number
  vigentes?: Array<{
    id: string
    descricao: string
    valorMensal: number
  }>
  itens: CustoFixoItem[]
}

export interface VisaoMes {
  ehProjecao: boolean
  mes: string
  entradasPrevistas: number
  entradasRecebidas?: number
  custosFixosVigentes: number
  metaFaturamento: number | null
  pontoEquilibrio: number | null
  margemPercentualBase: number
  cobreCustosFixos: boolean
  cobreCustosFixosRecebido?: boolean
  sobraOuFalta: number
  sobraOuFaltaRecebido?: number
  saldoCaixaPrevisto?: number
  saldoCaixaRealizado?: number
  regraMeta: string
  leitura?: string
}

export interface FluxoCaixaMensal {
  mes: string
  entradasPrevistas: number
  entradasRecebidas: number
  saidasPrevistas: number
  saidasPagas: number
  saldoPrevisto: number
  saldoRealizado: number
  caixaPositivoPrevisto: boolean
  caixaPositivoRealizado: boolean
}

export interface ContaAReceberItem {
  idTransacao: string
  dataVencimento: string
  dataPagamento: string | null
  valorPrevisto: number
  valorRealizado: number | null
  status: string
  recebido: boolean
  descricao: string | null
  /** Só para vínculo interno — não exibir na UI. */
  idVenda: string | null
  dataVenda?: string | null
  cliente: string | null
}

export interface ContasAReceber {
  mes: string
  itens: ContaAReceberItem[]
  totalPrevisto: number
  totalRecebido: number
  totalEmAberto: number
}

export interface ContaAVencer {
  dataVencimento: string
  valorPrevisto: number
  status: string
  tipoMovimentacao: string
  tipoConta: string
  categoria: string | null
  subcategoria: string | null
}

export interface ContaAPagarItem {
  idTransacao: string
  dataVencimento: string
  valorPrevisto: number
  status: string
  tipoMovimentacao: string
  tipoConta: string
  categoria: string | null
  subcategoria: string | null
  descricao: string | null
  vencida: boolean
}

export interface ContasAPagar {
  hoje: string
  horizonteDias: number
  itens: ContaAPagarItem[]
  vencidas: ContaAPagarItem[]
  proximas: ContaAPagarItem[]
  total: number
  totalVencido: number
  totalProximo: number
}

export interface ProjecaoMetas {
  mesReferencia: string
  mesProjecao: string
  entradasPrevistas: number
  custosFixosPrevistos: number
  cobreCustosFixos: boolean
  sobraOuFalta: number
  margemPercentualBase: number
  pontoEquilibrioFaturamento: number | null
  metaConfortavelFaturamento: number | null
  regraMeta: string
}

export interface PainelSocios {
  mes: string
  resultado: ResultadoMensal
  rentabilidade: Rentabilidade
  custosFixos: CustosFixos
  projecao: ProjecaoMetas
  visaoMes?: VisaoMes
  fluxoCaixa?: FluxoCaixaMensal
  contasAReceber?: ContasAReceber
}

export interface QuantidadeProdutoResponse {
  mes: string
  filtro: string
  totalPecas?: number
  totalVendas: number
  observacao: string
  itens: Array<{
    produto: string
    linha?: string
    quantidade?: number
    quantidadeVendas: number
    faturamento: number
  }>
}

export interface CatalogoLinhaItem {
  linha: string
  quantidadeSkus: number
  corPrincipal: 'PERFIL' | 'VIDRO' | 'PERGUNTAR'
}

export interface CatalogoCorItem {
  codigo: string
  nome: string
}

/* —— Catálogo (dt_catalogo) —— */
export interface CatalogoProdutoItem {
  idProduto: number
  idProdutoAnalytics: string
  linha: string
  produto: string
  cor: string
  categoria: string
  descricao: string | null
  unidadeVenda: string
  rotulo: string
}

export interface CatalogoCustoItem {
  idCusto: number
  idProdutoCatalogo: number | null
  tipoCusto: string
  descricao: string
  linha: string | null
  produto: string | null
  cor: string | null
  espessura: string | null
  tipoVidro: string | null
  unidadeCusto: string
  rotulo: string
}

export interface VendaResumo {
  idVenda: string
  dataVenda: string
  valorTotal: number
  status: string
  observacao: string | null
  qtdItens: number
  resumo: string | null
  cliente?: string | null
  rotulo: string
}

export interface VendaGastoDetalhe {
  idCustoCatalogo: number
  descricao: string
  tipoCusto: string | null
  linha: string | null
  valor: number
  quantidade: number
  valorUnitario: number
}

export interface VendaItemDetalhe {
  idVendaItem: string
  idProdutoCatalogo: number
  linha: string
  produto: string
  cor: string
  tipoCorPrincipal?: 'PERFIL' | 'VIDRO' | 'ACESSORIO'
  corPerfil?: string | null
  corVidro?: string | null
  corAcessorio?: string | null
  unidadeVenda: string
  quantidade: number
  valorUnitario: number
  faturamento?: number
  gastosTotal?: number
  lucro?: number
  margemPercentual?: number
  temGastosLancados?: boolean
  gastos: VendaGastoDetalhe[]
}

export interface VendaDetalhe {
  idVenda: string
  idCliente: string | null
  cliente: string | null
  dataVenda: string
  dataPrevisaoRecebimento: string
  dataPagamento?: string | null
  mesRecebimento?: string | null
  observacao: string | null
  valorTotal: number
  valorRecebido?: number
  valorPendente?: number
  recebimentoParcial?: boolean
  status: string
  jaRecebido: boolean
  totais?: {
    faturamento: number
    gastos: number
    lucro: number
    margemPercentual: number
    temGastosLancados: boolean
  }
  itens: VendaItemDetalhe[]
}

export interface CalendarioVendas {
  mes: string
  dias: Array<{
    data: string
    quantidade: number
    faturamento: number
  }>
}

export interface GastoLancamentoPayload {
  idCustoCatalogo: number
  descricao: string
  tipoCusto?: string
  espessura?: string | null
  linha?: string | null
  valor: number
  quantidade: number
  valorUnitario: number
}

export interface ItemVendaPayload {
  idProdutoCatalogo: number
  linha: string
  produto: string
  cor: string
  tipoCorPrincipal?: 'PERFIL' | 'VIDRO' | 'ACESSORIO'
  corPerfil?: string | null
  corVidro?: string | null
  corAcessorio?: string | null
  unidadeVenda?: string
  quantidade: number
  valorUnitario: number
  gastos?: GastoLancamentoPayload[]
}

export interface Cliente {
  id: string
  matricula: string
  tipoPessoa: 'PF' | 'PJ'
  nome: string
  nomeCompleto: string | null
  razaoSocial: string | null
  nomeFantasia?: string | null
  cpf?: string | null
  cnpj?: string | null
  rg?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  email?: string | null
  telefone?: string | null
  celular?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  contatoNome?: string | null
  observacao?: string | null
  dataCadastro?: string | null
  ativo?: boolean
}

export interface CriarClientePayload {
  tipoPessoa: 'PF' | 'PJ'
  nome: string
  nomeCompleto?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
  cpf?: string | null
  cnpj?: string | null
  rg?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  email?: string | null
  telefone?: string | null
  celular?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  contatoNome?: string | null
  observacao?: string | null
}

export type AtualizarClientePayload = CriarClientePayload

export interface CriarVendaPayload {
  itens: ItemVendaPayload[]
  dataPrevisaoRecebimento: string
  dataVenda?: string
  observacao?: string
  /** Matrícula de 8 dígitos do cliente. */
  idCliente: string
  /** Sinal pago no ato do fechamento. Sem sinal = 100% a receber. */
  houveSinal?: boolean
  valorSinal?: number
}

export interface CriarCustoPayload {
  idCustoCatalogo: number
  descricao: string
  tipoCusto?: string
  espessura?: string | null
  linha?: string | null
  valor: number
  quantidade: number
  valorUnitario: number
  associadoAVenda: boolean
  idVenda?: string
  dataCusto?: string
  observacao?: string
}

export interface DespesaFixaCadastro {
  id: string
  descricao: string
  categoriaId: string
  categoriaLabel: string
  categoria: string
  subcategoria: string | null
  valorMensal: number
  diaVencimento: number
  dataInicio: string
  dataFim: string | null
  semTermino: boolean
  observacao: string | null
  ativo: boolean
  proximaParcela?: {
    idTransacao: string
    dataVencimento: string | null
    status: string | null
  } | null
  parcelaMesAtualPaga?: boolean
  parcelaMesAtualId?: string | null
  qtdPagamentos?: number
  ultimoPagamento?: string | null
  pagoHoje?: boolean
  ultimaParcelaPagaHoje?: {
    idTransacao: string
    dataVencimento: string | null
    dataPagamento: string | null
  } | null
}

export interface ProximoVencimento {
  idTransacao: string
  idDespesaFixa: string
  descricao: string
  dataVencimento: string
  valor: number
  status: string
  diaVencimento: number
  vencida?: boolean
}

export interface HistoricoPagamentoItem {
  id: string
  dataPagamento: string
  competencia: string
  valorPago: number
  idUsuario: string | null
  observacao: string | null
  criadoEm: string
}

export interface CriarDespesaFixaPayload {
  descricao: string
  categoriaId: string
  valorMensal: number
  diaVencimento: number
  dataInicio: string
  semTermino: boolean
  dataFim?: string
  observacao?: string
}

export interface AtualizarDespesaFixaPayload {
  descricao?: string
  categoriaId?: string
  valorMensal?: number
  diaVencimento?: number
  dataInicio?: string
  semTermino?: boolean
  dataFim?: string | null
  observacao?: string | null
}

/** @deprecated Mantido só para telas legadas em migração */
export type TipoMovimento = 'entrada' | 'saida'
export type LinhaProduto = string
export type Produto = string
export type CategoriaDespesa = string

export interface Lancamento {
  id: string
  tipo: TipoMovimento
  linha: LinhaProduto
  produto: Produto
  cliente: string
  descricao: string
  valor: number
  material?: string
  data: string
}

export interface DespesaFixa {
  id: string
  categoria: CategoriaDespesa
  descricao: string
  valor: number
  dataInicio: string
  dataFim?: string
}
