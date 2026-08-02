export type CategoriaCustoFixoId =
  | 'estrutura'
  | 'folha'
  | 'veiculo'
  | 'seguranca'
  | 'alimentacao'
  | 'estoque'
  | 'utilidades'
  | 'software'
  | 'seguros'
  | 'financeiro'
  | 'marketing'
  | 'outros';

export type CategoriaCustoFixo = {
  id: CategoriaCustoFixoId;
  label: string;
  categoria: string;
  subcategoria: string;
};

export const CATEGORIAS_CUSTO_FIXO: readonly CategoriaCustoFixo[] = [
  {
    id: 'estrutura',
    label: 'Estrutura e ocupação',
    categoria: 'Estrutura',
    subcategoria: 'Aluguel, condomínio e IPTU',
  },
  {
    id: 'folha',
    label: 'Folha de pagamento',
    categoria: 'Pessoal',
    subcategoria: 'Salários, encargos e pró-labore',
  },
  {
    id: 'veiculo',
    label: 'Veículos e transporte',
    categoria: 'Frota',
    subcategoria: 'Financiamento, IPVA e custos fixos de veículo',
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    categoria: 'Segurança',
    subcategoria: 'Alarme, monitoramento e vigilância',
  },
  {
    id: 'alimentacao',
    label: 'Alimentação',
    categoria: 'Pessoal',
    subcategoria: 'Refeições e vale-alimentação',
  },
  {
    id: 'estoque',
    label: 'Estoque e insumos fixos',
    categoria: 'Operação',
    subcategoria: 'Manutenção mínima de estoque',
  },
  {
    id: 'utilidades',
    label: 'Utilidades',
    categoria: 'Infraestrutura',
    subcategoria: 'Energia, água, internet e gás',
  },
  {
    id: 'software',
    label: 'Software e sistemas',
    categoria: 'Tecnologia',
    subcategoria: 'Assinaturas e sistemas recorrentes',
  },
  {
    id: 'seguros',
    label: 'Seguros',
    categoria: 'Proteção',
    subcategoria: 'Patrimonial, frota e responsabilidade',
  },
  {
    id: 'financeiro',
    label: 'Obrigações financeiras',
    categoria: 'Financeiro',
    subcategoria: 'Empréstimos e taxas bancárias fixas',
  },
  {
    id: 'marketing',
    label: 'Marketing fixo',
    categoria: 'Comercial',
    subcategoria: 'Anúncios e ações recorrentes',
  },
  {
    id: 'outros',
    label: 'Outros custos fixos',
    categoria: 'Outros',
    subcategoria: 'Demais despesas recorrentes',
  },
] as const;

export function getCategoriaCustoFixo(
  id: string,
): CategoriaCustoFixo | undefined {
  return CATEGORIAS_CUSTO_FIXO.find((c) => c.id === id);
}

export function planoContasIdFromCategoria(categoriaId: string): string {
  return `pc_df_${categoriaId}`;
}

export function categoriaIdFromPlanoContas(
  idPlano: string | null | undefined,
): CategoriaCustoFixoId | null {
  if (!idPlano?.startsWith('pc_df_')) return null;
  const id = idPlano.slice('pc_df_'.length) as CategoriaCustoFixoId;
  return getCategoriaCustoFixo(id) ? id : null;
}

export const CATEGORIA_IDS = CATEGORIAS_CUSTO_FIXO.map((c) => c.id);
