import type { TourFlow } from './types'

export const TOUR_FLOWS: TourFlow[] = [
  {
    id: 'lancamento',
    question: 'Como fazer um lançamento?',
    description:
      'Registre venda ou custo e veja o impacto no resultado do mês.',
    requiresOperar: true,
    steps: [
      {
        selector: '[data-tour="nav-lancamentos"]',
        title: 'Passo 1 · Abrir lançamentos',
        body: 'Entre em Lançamentos. Tudo que você registrar aqui alimenta o faturamento e os custos variáveis da Análise do mês.',
        route: '/lancamentos',
        actions: ['open-sidebar', 'reset-lancamentos'],
        placement: 'right',
      },
      {
        selector: '[data-tour="lanc-venda"]',
        title: 'Passo 2 · Escolher venda',
        body: 'Use “Lançar venda” para registrar itens vendidos. Cada item soma no faturamento do mês da previsão de recebimento.',
        route: '/lancamentos',
        actions: ['reset-lancamentos'],
        placement: 'bottom',
        allowInteract: true,
      },
      {
        selector: '[data-tour="lanc-itens"]',
        title: 'Passo 3 · Itens do pedido',
        body: 'Selecione linha → produto → cor (só combinações válidas do catálogo). Informe quantidade e valor unitário. Isso define a receita e a rentabilidade por linha.',
        route: '/lancamentos',
        actions: ['open-venda'],
        placement: 'right',
      },
      {
        selector: '[data-tour="lanc-previsao"]',
        title: 'Passo 4 · Previsão de recebimento',
        body: 'A data decide em qual mês o valor entra na Análise. Se a previsão for no mês seguinte, o faturamento aparece naquele período — não no mês do lançamento.',
        route: '/lancamentos',
        actions: ['open-venda'],
        placement: 'top',
      },
      {
        selector: '[data-tour="lanc-salvar-venda"]',
        title: 'Passo 5 · Salvar',
        body: 'Ao salvar, a venda vai para o analytics. Na Análise, o card de faturamento e o lucro operacional do mês correspondente sobem automaticamente.',
        route: '/lancamentos',
        actions: ['open-venda'],
        placement: 'top',
      },
      {
        selector: '[data-tour="nav-analise"]',
        title: 'Passo 6 · Conferir na Análise',
        body: 'Abra a Análise e escolha o mês da previsão. Você verá o impacto no resultado, no confronto e na rentabilidade por linha/produto.',
        route: '/analise',
        actions: ['open-sidebar'],
        placement: 'right',
      },
    ],
  },
  {
    id: 'analise-mes',
    question: 'Como analisar o mês vigente ou anterior?',
    description: 'Troque o período e leia o resultado operacional.',
    requiresAnalisar: true,
    steps: [
      {
        selector: '[data-tour="nav-analise"]',
        title: 'Passo 1 · Ir para Análise',
        body: 'A Análise consolida vendas, custos variáveis e fixos do mês escolhido — o painel que você usa na reunião com sócios.',
        route: '/analise',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="analise-mes"]',
        title: 'Passo 2 · Selecionar o mês',
        body: 'O seletor lista os últimos 12 meses. O primeiro é o mês vigente; escolha um anterior para comparar desempenho histórico.',
        route: '/analise',
        placement: 'bottom',
        allowInteract: true,
      },
      {
        selector: '[data-tour="analise-veredicto"]',
        title: 'Passo 3 · Resultado do mês',
        body: 'Lucro operacional = faturamento − custos variáveis − custos fixos. Verde = mês lucrativo; vermelho = déficit. Tudo reflete os lançamentos daquele período.',
        route: '/analise',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="analise-stats"]',
        title: 'Passo 4 · Indicadores-chave',
        body: 'Faturamento vem das vendas; custos variáveis dos gastos lançados; custos fixos das despesas recorrentes. A meta confortável mostra quanto faturar para cobrir tudo com folga.',
        route: '/analise',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="analise-charts"]',
        title: 'Passo 5 · Gráficos',
        body: 'O confronto compara entradas e saídas. Lucro por linha e produto ajuda a priorizar o mix — útil para decidir o que vender mais no próximo mês.',
        route: '/analise',
        placement: 'top',
      },
    ],
  },
  {
    id: 'clientes',
    question: 'Como cadastrar clientes?',
    description: 'Base comercial PF/PJ da empresa.',
    requiresOperar: true,
    steps: [
      {
        selector: '[data-tour="nav-clientes"]',
        title: 'Passo 1 · Abrir Clientes',
        body: 'Toda venda precisa de um cliente. Comece pela base comercial antes do primeiro lançamento.',
        route: '/clientes',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="clientes-novo"]',
        title: 'Passo 2 · Novo cliente',
        body: 'Informe pelo menos o nome. A matrícula de 8 dígitos é gerada automaticamente.',
        route: '/clientes',
        placement: 'left',
        allowInteract: true,
      },
    ],
  },
  {
    id: 'equipe',
    question: 'Como convidar a equipe?',
    description: 'Crie acessos ADM, Vendas ou Sócio com senha temporária.',
    requiresGestaoEquipe: true,
    steps: [
      {
        selector: '[data-tour="nav-equipe"]',
        title: 'Passo 1 · Equipe',
        body: 'Só o Diretor gerencia usuários. O limite depende do plano (Basic = 1, Standard = 2, Pro = ilimitado).',
        route: '/equipe',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="equipe-novo"]',
        title: 'Passo 2 · Novo acesso',
        body: 'Defina e-mail, cargo e senha temporária. No primeiro login, a pessoa é obrigada a trocar a senha.',
        route: '/equipe',
        placement: 'left',
        allowInteract: true,
      },
    ],
  },
  {
    id: 'chat',
    question: 'Como usar a consulta rápida?',
    description: 'Pergunte números do mês sem digitar.',
    requiresAnalisar: true,
    requiresChat: true,
    steps: [
      {
        selector: '[data-tour="chat-fab"]',
        title: 'Passo 1 · Botão flutuante',
        body: 'O ícone de conversa abre o assistente. Você pode arrastar para outro canto da tela.',
        route: '/analise',
        placement: 'left',
        allowInteract: true,
      },
      {
        selector: '[data-tour="chat-fab"]',
        title: 'Passo 2 · Perguntas prontas',
        body: 'Toque em resumo do mês, produto mais rentável, custos fixos ou meta — a resposta usa os dados reais da empresa.',
        route: '/analise',
        placement: 'left',
      },
    ],
  },
  {
    id: 'exportar',
    question: 'Como exportar em PDF ou planilha?',
    description: 'Baixe o painel do mês para compartilhar com sócios.',
    requiresAnalisar: true,
    requiresExport: true,
    steps: [
      {
        selector: '[data-tour="nav-analise"]',
        title: 'Passo 1 · Abrir a Análise',
        body: 'As exportações usam exatamente os dados do painel do mês selecionado — o mesmo que você vê na tela.',
        route: '/analise',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="analise-mes"]',
        title: 'Passo 2 · Escolher o mês',
        body: 'Antes de exportar, confirme o mês. PDF e Excel herdam esse período no nome do arquivo e nos totais.',
        route: '/analise',
        placement: 'bottom',
        allowInteract: true,
      },
      {
        selector: '[data-tour="export-excel"]',
        title: 'Passo 3 · Planilha Excel',
        body: 'Gera um .xlsx com resultado, custos e indicadores. Ideal para abrir no Excel/Google Sheets e editar antes da reunião.',
        route: '/analise',
        placement: 'bottom',
        allowInteract: true,
      },
      {
        selector: '[data-tour="export-pdf"]',
        title: 'Passo 4 · Relatório PDF',
        body: 'Gera um PDF pronto para enviar por e-mail ou imprimir. Contém o mesmo recorte analítico do mês, sem alterar dados no sistema.',
        route: '/analise',
        placement: 'bottom',
        allowInteract: true,
      },
    ],
  },
  {
    id: 'senha',
    question: 'Como mudar minha senha de acesso?',
    description: 'Atualize senha ou e-mail de login com segurança.',
    steps: [
      {
        selector: '[data-tour="nav-config"]',
        title: 'Passo 1 · Abrir Configurações',
        body: 'No rodapé do menu, ao lado de Sair, toque em Configurações. É a área da sua conta — não altera dados financeiros.',
        route: '/conta',
        actions: ['open-sidebar'],
        placement: 'top',
      },
      {
        selector: '[data-tour="conta-senha"]',
        title: 'Passo 2 · Alterar senha',
        body: 'Informe a senha atual, a nova e a confirmação. Use o ícone de olho para conferir. A senha fica armazenada como hash — nunca em texto puro.',
        route: '/conta',
        placement: 'right',
        allowInteract: true,
      },
      {
        selector: '[data-tour="conta-email"]',
        title: 'Passo 3 · E-mail de login',
        body: 'Se precisar trocar o e-mail de recuperação/login, preencha o novo e confirme com a senha atual. A sessão é renovada automaticamente.',
        route: '/conta',
        placement: 'left',
        allowInteract: true,
      },
    ],
  },
  {
    id: 'primeiro-ciclo',
    question: 'Como fechar o ciclo: venda → Recebido → DRE vs caixa?',
    description:
      'O fluxo completo do primeiro cliente: lançar, receber e ler o painel.',
    requiresOperar: true,
    requiresAnalisar: true,
    steps: [
      {
        selector: '[data-tour="nav-lancamentos"]',
        title: 'Passo 1 · Lançar a venda',
        body: 'Registre a venda com cliente, itens e previsão de recebimento. Isso alimenta o DRE do mês da competência.',
        route: '/lancamentos',
        actions: ['open-sidebar', 'reset-lancamentos'],
        placement: 'right',
      },
      {
        selector: '[data-tour="nav-analise"]',
        title: 'Passo 2 · Ir para Análise',
        body: 'Abra a Análise no mês da previsão. O DRE já enxerga a venda; o caixa só muda depois do Recebido.',
        route: '/analise',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="analise-caixa"]',
        title: 'Passo 3 · Caixa vs DRE',
        body: 'Este card mostra o fluxo de caixa. Ele é diferente do lucro operacional (DRE) — um olha competência, o outro olha dinheiro.',
        route: '/analise',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="analise-contas-receber"]',
        title: 'Passo 4 · Contas a receber',
        body: 'Aqui ficam as vendas em aberto. Quando o cliente pagar, use Recebido (só Diretor) para realizar o caixa.',
        route: '/analise',
        placement: 'top',
      },
      {
        selector: '[data-tour="analise-receber-btn"]',
        title: 'Passo 5 · Marcar Recebido',
        body: 'Ao confirmar, o valor entra no caixa realizado. O DRE da venda não muda — só o fluxo de caixa.',
        route: '/analise',
        placement: 'left',
        allowInteract: true,
      },
    ],
  },
  {
    id: 'despesas',
    question: 'Como funcionam as despesas fixas?',
    description: 'Entenda custos recorrentes e o efeito no mês.',
    requiresGestaoFinanceira: true,
    steps: [
      {
        selector: '[data-tour="nav-despesas"]',
        title: 'Passo 1 · Despesas fixas',
        body: 'Despesas fixas são custos recorrentes (aluguel, folha, veículo etc.). Elas entram no resultado do mês mesmo sem uma venda específica.',
        route: '/despesas',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="despesas-ranking"]',
        title: 'Passo 2 · Maiores custos em destaque',
        body: 'O ranking mostra quem pesa mais no mês — barras proporcionais ao valor. Use isso para priorizar cortes ou renegociações.',
        route: '/despesas',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="despesas-novo"]',
        title: 'Passo 3 · Incluir novo custo',
        body: 'Cadastre nome, categoria, valor, dia de vencimento e vigência. Sem término = contínuo; com data fim = parcelamento/contrato que acaba.',
        route: '/despesas',
        placement: 'left',
        allowInteract: true,
      },
      {
        selector: '[data-tour="nav-analise"]',
        title: 'Passo 4 · Ver no painel',
        body: 'Na Análise, o card “Custos fixos” e o lucro operacional usam esses valores. Se o faturamento não cobrir fixos + variáveis, o mês fica em déficit.',
        route: '/analise',
        actions: ['open-sidebar'],
        placement: 'right',
      },
    ],
  },
]

export function getTourFlow(id: string): TourFlow | undefined {
  return TOUR_FLOWS.find((f) => f.id === id)
}

export type TourAccess = {
  podeOperar: boolean
  podeAnalisar: boolean
  podeGestaoFinanceira: boolean
  podeGestaoEquipe: boolean
  podeChat: boolean
  podeExportar: boolean
}

export function flowAllowed(flow: TourFlow, access: TourAccess) {
  if (flow.requiresOperar && !access.podeOperar) return false
  if (flow.requiresAnalisar && !access.podeAnalisar) return false
  if (flow.requiresGestaoFinanceira && !access.podeGestaoFinanceira) {
    return false
  }
  if (flow.requiresGestaoEquipe && !access.podeGestaoEquipe) return false
  if (flow.requiresExport && !access.podeExportar) return false
  if (flow.requiresChat && !access.podeChat) return false
  return true
}
