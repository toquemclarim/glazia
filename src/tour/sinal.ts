import type { TourFlow, TourStep } from './types'
import type { WelcomeContext } from './welcome'

export function sinalTourStorageKey(userId: string) {
  return `glazia-sinal-tour-${userId}`
}

export function wasSinalTourCompleted(userId: string) {
  try {
    return localStorage.getItem(sinalTourStorageKey(userId)) === '1'
  } catch {
    return true
  }
}

export function markSinalTourCompleted(userId: string) {
  try {
    localStorage.setItem(sinalTourStorageKey(userId), '1')
  } catch {
    /* ignore */
  }
}

/** Monta o tour de novidade (sinal e saldo) conforme o cargo. */
export function buildSinalFlow(ctx: WelcomeContext): TourFlow {
  const diretor = ctx.podeGestaoFinanceira
  const receberQuem = diretor
    ? 'Você confirma quando o cliente pagar.'
    : 'O diretor confirma quando o cliente pagar.'

  const encerramento: TourStep = {
    selector: '[data-tour="receber-demo"]',
    title: 'Pronto!',
    body: 'Pronto! Agora você já sabe como registrar sinais e acompanhar pagamentos parcelados em suas vendas.',
    route: '/analise',
    actions: ['open-receber-demo', 'receber-demo-menor'],
    placement: 'left',
  }

  if (!ctx.podeOperar) {
    return {
      id: 'sinal-parcelas',
      question: 'Sinal e pagamentos parcelados',
      description:
        'Como acompanhar entrada, saldo e o que ainda falta receber.',
      novelty: true,
      steps: [
        {
          selector: '[data-tour="nav-analise"]',
          title: 'Novidade no caixa',
          body: 'Agora a venda pode entrar com um sinal e o restante ficar a receber. Nada se perde no meio do caminho.',
          route: '/analise',
          actions: ['open-sidebar', 'reset-feature-demo'],
          placement: 'right',
        },
        {
          selector: '[data-tour="analise-contas-receber"]',
          title: 'O que falta receber',
          body: `Sinal já entrou no caixa. O saldo aparece aqui, em aberto. ${receberQuem}`,
          route: '/analise',
          actions: ['reset-feature-demo'],
          placement: 'top',
        },
        {
          selector: '[data-tour="receber-demo"]',
          title: 'Quanto foi pago?',
          body: 'Dá para quitar o total ou informar um valor menor. O resto continua pendente para depois.',
          route: '/analise',
          actions: ['open-receber-demo'],
          placement: 'left',
        },
        encerramento,
      ],
    }
  }

  return {
    id: 'sinal-parcelas',
    question: 'Sinal e pagamentos parcelados',
    description:
      'Como registrar a entrada no fechamento e acompanhar o restante.',
    novelty: true,
    requiresOperar: true,
    steps: [
      {
        selector: '[data-tour="lanc-venda"]',
        title: 'Novidade: sinal na venda',
        body: 'Agora dá para registrar o sinal no fechamento e deixar o resto a receber — sem perder o controle do caixa.',
        route: '/lancamentos',
        actions: ['open-sidebar', 'reset-lancamentos', 'reset-feature-demo'],
        placement: 'bottom',
      },
      {
        selector: '[data-tour="lanc-previsao"]',
        title: 'Quando espera o restante',
        body: 'A previsão é a data do saldo. O sinal, se houver, entra no caixa no dia da venda.',
        route: '/lancamentos',
        actions: ['open-venda', 'reset-feature-demo'],
        placement: 'top',
      },
      {
        selector: '[data-tour="sinal-demo"]',
        title: 'Houve sinal?',
        body: 'Se não entrou nada, o valor fica completo a receber. É só seguir.',
        route: '/lancamentos',
        actions: ['open-venda', 'open-sinal-demo'],
        placement: 'left',
      },
      {
        selector: '[data-tour="sinal-demo"]',
        title: 'Informe a entrada',
        body: 'Digite o sinal. O resto fica pendente e aparece em Contas a receber.',
        route: '/lancamentos',
        actions: ['open-venda', 'sinal-demo-sim'],
        placement: 'left',
      },
      {
        selector: '[data-tour="analise-contas-receber"]',
        title: 'Acompanhe o saldo',
        body: `O que falta aparece aqui. ${receberQuem}`,
        route: '/analise',
        actions: ['open-sidebar', 'reset-feature-demo'],
        placement: 'top',
      },
      {
        selector: '[data-tour="receber-demo"]',
        title: 'Quanto foi pago?',
        body: 'Valor total ou um valor menor. O resto continua pendente para marcar depois.',
        route: '/analise',
        actions: ['open-receber-demo'],
        placement: 'left',
      },
      encerramento,
    ],
  }
}
