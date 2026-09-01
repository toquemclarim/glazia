export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto'

export type TourAction =
  | 'open-sidebar'
  | 'close-sidebar'
  | 'open-venda'
  | 'open-custo'
  | 'reset-lancamentos'
  | 'open-sinal-demo'
  | 'sinal-demo-sim'
  | 'open-receber-demo'
  | 'receber-demo-menor'
  | 'reset-feature-demo'

export type TourStep = {
  /** Seletor CSS do alvo (ex.: [data-tour="nav-analise"]) */
  selector: string
  title: string
  body: string
  /** Navega para esta rota antes de destacar */
  route?: string
  placement?: TourPlacement
  /** Ações disparadas antes de mostrar o passo */
  actions?: TourAction[]
  /** Permite clicar no elemento destacado */
  allowInteract?: boolean
}

export type TourFlowId =
  | 'boas-vindas'
  | 'sinal-parcelas'
  | 'lancamento'
  | 'analise-mes'
  | 'exportar'
  | 'senha'
  | 'despesas'
  | 'primeiro-ciclo'
  | 'clientes'
  | 'equipe'
  | 'chat'

export type TourFlow = {
  id: TourFlowId
  question: string
  description: string
  /** Selo de novidade no tooltip e no picker. */
  novelty?: boolean
  /** Se true, ADM, Diretor ou Vendas */
  requiresOperar?: boolean
  /** Se true, Diretor ou Sócio */
  requiresAnalisar?: boolean
  /** Se true, só Diretor */
  requiresGestaoFinanceira?: boolean
  /** Se true, só Diretor (Equipe) */
  requiresGestaoEquipe?: boolean
  /** Se true, plano com exportação (Standard/Pro) */
  requiresExport?: boolean
  /** Se true, plano com chat (Standard/Pro) */
  requiresChat?: boolean
  steps: TourStep[]
}
