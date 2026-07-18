export type TipoMovimento = 'entrada' | 'saida'

export type LinhaProduto = 'L. SUPREMA' | 'L. GOLD' | 'L. Slick'

export type Produto = 'Box' | 'Sacada' | 'Janela' | 'Portão'

export type CategoriaDespesa = 'Operacional' | 'Parcelamentos' | 'Alimentação'

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

export interface Usuario {
  nome: string
  email: string
  empresaId?: string
}

export const LINHAS: LinhaProduto[] = ['L. SUPREMA', 'L. GOLD', 'L. Slick']
export const PRODUTOS: Produto[] = ['Box', 'Sacada', 'Janela', 'Portão']
export const CATEGORIAS: CategoriaDespesa[] = ['Operacional', 'Parcelamentos', 'Alimentação']
export const MATERIAIS = [
  'Vidro temperado 8mm',
  'Vidro laminado 10mm',
  'Alumínio anodizado',
  'Perfil de aço inox',
  'Ferragens e dobradiças',
  'Silicone estrutural',
  'Kit box completo',
  'Chapa galvanizada',
]
