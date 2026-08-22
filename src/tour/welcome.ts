import type { Cargo } from '../types'
import type { TourFlow, TourStep } from './types'

export type WelcomeContext = {
  cargo: Cargo
  planoLabel: string
  podeOperar: boolean
  podeAnalisar: boolean
  podeGestaoFinanceira: boolean
  podeGestaoEquipe: boolean
  podeChat: boolean
  podeExportar: boolean
}

const CARGO_LABEL: Record<Cargo, string> = {
  ADM: 'ADM',
  DIRETOR: 'Diretor',
  SOCIO: 'Sócio',
  VENDAS: 'Vendas',
  PLATFORM: 'Ops',
}

export function welcomeStorageKey(userId: string) {
  return `glazia-welcome-tour-${userId}`
}

export function wasWelcomeCompleted(userId: string) {
  try {
    return localStorage.getItem(welcomeStorageKey(userId)) === '1'
  } catch {
    return true
  }
}

export function markWelcomeCompleted(userId: string) {
  try {
    localStorage.setItem(welcomeStorageKey(userId), '1')
  } catch {
    /* ignore */
  }
}

/** Monta o tour de primeiros passos conforme cargo + plano. */
export function buildWelcomeFlow(ctx: WelcomeContext): TourFlow {
  const papel = CARGO_LABEL[ctx.cargo] || ctx.cargo
  const steps: TourStep[] = [
    {
      selector: '[data-tour="home-hero"]',
      title: 'Bem-vindo ao Glazia',
      body: `Você entrou como ${papel} no plano ${ctx.planoLabel}. Este tour rápido mostra só o que o seu acesso pode usar — e onde começar.`,
      route: '/home',
      placement: 'bottom',
    },
    {
      selector: '[data-tour="nav-home"]',
      title: 'Menu lateral',
      body: 'Pelo menu você acessa as áreas liberadas para o seu cargo. Em celular, abra pelo ícone ☰ no topo.',
      route: '/home',
      actions: ['open-sidebar'],
      placement: 'right',
    },
  ]

  if (ctx.podeOperar) {
    steps.push(
      {
        selector: '[data-tour="nav-clientes"]',
        title: 'Clientes',
        body: 'Cadastre quem compra da vidraçaria. Só o nome é obrigatório — a matrícula é gerada automaticamente.',
        route: '/clientes',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="clientes-novo"]',
        title: 'Primeiro passo · novo cliente',
        body: 'Comece por aqui. Sem cliente, a venda não fecha. Depois você completa CPF/CNPJ se precisar.',
        route: '/clientes',
        placement: 'left',
        allowInteract: true,
      },
      {
        selector: '[data-tour="nav-lancamentos"]',
        title: 'Lançamentos',
        body: 'Aqui entram vendas e custos do dia. Tudo que você lançar alimenta o painel financeiro da empresa.',
        route: '/lancamentos',
        actions: ['open-sidebar', 'reset-lancamentos'],
        placement: 'right',
      },
      {
        selector: '[data-tour="lanc-venda"]',
        title: 'Lançar venda',
        body: 'Escolha cliente → linha → produto → cor principal (e, se quiser, vidro ou acessórios). É o coração da operação.',
        route: '/lancamentos',
        actions: ['reset-lancamentos'],
        placement: 'bottom',
        allowInteract: true,
      },
      {
        selector: '[data-tour="lanc-gerenciar"]',
        title: 'Gerenciar vendas',
        body: 'Errou algo? Edite ou exclua vendas recentes — o sistema sempre pede confirmação antes de gravar a mudança.',
        route: '/lancamentos',
        actions: ['reset-lancamentos'],
        placement: 'bottom',
      },
    )
  }

  if (ctx.podeGestaoFinanceira) {
    steps.push(
      {
        selector: '[data-tour="nav-despesas"]',
        title: 'Despesas fixas',
        body: 'Aluguel, folha, veículo… custos que se repetem todo mês. Ajuste os valores do seed e marque como pago quando quitados.',
        route: '/despesas',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="despesas-novo"]',
        title: 'Incluir ou revisar custos',
        body: 'Cadastre novos custos ou edite os existentes. Eles entram no resultado do mês mesmo sem uma venda específica.',
        route: '/despesas',
        placement: 'left',
        allowInteract: true,
      },
    )
  }

  if (ctx.podeGestaoEquipe) {
    steps.push({
      selector: '[data-tour="nav-equipe"]',
      title: 'Equipe',
      body:
        ctx.planoLabel === 'Basic'
          ? 'No Basic só há 1 usuário (você). Para convidar ADM, Vendas ou Sócio, faça upgrade para Standard ou Pro.'
          : `No plano ${ctx.planoLabel} você convida ADM, Vendas ou Sócio com senha temporária. Eles trocam a senha no primeiro acesso.`,
      route: '/equipe',
      actions: ['open-sidebar'],
      placement: 'right',
    })
  }

  if (ctx.podeAnalisar) {
    steps.push(
      {
        selector: '[data-tour="nav-analise"]',
        title: 'Análise financeira',
        body: 'Painel do mês: DRE (o que foi vendido) e caixa (o que entrou de dinheiro). São visões diferentes — e as duas importam.',
        route: '/analise',
        actions: ['open-sidebar'],
        placement: 'right',
      },
      {
        selector: '[data-tour="analise-veredicto"]',
        title: 'Resultado do mês',
        body: 'Lucro operacional = faturamento − custos variáveis − custos fixos. Verde = mês no azul; vermelho = déficit.',
        route: '/analise',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="analise-caixa"]',
        title: 'Caixa vs DRE',
        body: 'O caixa só muda quando você marca Recebido. A venda pode estar no DRE deste mês e o dinheiro cair só no próximo.',
        route: '/analise',
        placement: 'bottom',
      },
    )

    if (ctx.cargo === 'DIRETOR') {
      steps.push({
        selector: '[data-tour="analise-contas-receber"]',
        title: 'Contas a receber',
        body: 'Lista as entradas previstas. Quando o cliente pagar, use Recebido — só o Diretor confirma o pagamento no caixa.',
        route: '/analise',
        placement: 'top',
      })
    }

    if (ctx.podeExportar) {
      steps.push({
        selector: '[data-tour="export-buttons"]',
        title: 'Exportar PDF e Excel',
        body: `Incluso no plano ${ctx.planoLabel}. Exporte o painel do mês para reunião com sócios ou arquivo da contabilidade.`,
        route: '/analise',
        placement: 'bottom',
        allowInteract: true,
      })
    } else {
      steps.push({
        selector: '[data-tour="analise-mes"]',
        title: 'Exportação (upgrade)',
        body: 'No Basic a exportação PDF/Excel fica bloqueada. No Standard ou Pro você libera relatórios com um clique — fale no WhatsApp do upgrade.',
        route: '/analise',
        placement: 'bottom',
      })
    }

    steps.push({
      selector: '[data-tour="chat-fab"]',
      title: ctx.podeChat
        ? 'Consulta rápida'
        : 'Chat (disponível no Standard/Pro)',
      body: ctx.podeChat
        ? ctx.planoLabel === 'Pro'
          ? 'No Pro você digita perguntas (“quanto faturei?”, “quem me deve?”) ou usa atalhos — sempre só com dados da sua empresa.'
          : 'No Standard use os atalhos (resumo, produto, custos, meta). Digitar perguntas livres é exclusivo do Pro.'
        : 'No seu plano o chat fica bloqueado. Standard tem atalhos; Pro libera digitação livre — sempre com dados só da sua empresa.',
      route: '/analise',
      placement: 'left',
    })
  }

  steps.push(
    {
      selector: '[data-tour="nav-config"]',
      title: 'Sua conta',
      body: 'Troque senha ou e-mail quando quiser. A senha nunca fica em texto puro — só o hash fica no servidor.',
      route: '/conta',
      actions: ['open-sidebar'],
      placement: 'top',
    },
    {
      selector: '[data-tour="tour-fab"]',
      title: 'Ajuda quando precisar',
      body: 'Este ícone reabre o guia a qualquer momento: primeiros passos ou tópicos específicos (lançar venda, despesas, exportar…). Pode pular e voltar depois.',
      route: '/home',
      placement: 'left',
    },
  )

  steps.push({
    selector: '[data-tour="home-hero"]',
    title: 'Pronto para operar',
    body: ctx.podeOperar
      ? 'Na Home você vê o checklist dos primeiros passos. Cadastre um cliente, ajuste despesas (se for Diretor) e lance a primeira venda — o guia (?) fica sempre disponível.'
      : 'Use o menu para as áreas do seu cargo. O ícone de ajuda (?) reabre este guia ou tópicos específicos quando precisar.',
    route: '/home',
    placement: 'bottom',
  })

  return {
    id: 'boas-vindas',
    question: 'Tour de primeiros passos',
    description: `Guia completo do seu acesso (${papel} · ${ctx.planoLabel}).`,
    steps,
  }
}
