import type { PainelSocios } from '../types'
import { capitalize, formatCurrency, formatMonthLabel } from './format'

export type ChatIntentId =
  | 'resumo'
  | 'faturamento'
  | 'lucro'
  | 'margem'
  | 'custos_fixos'
  | 'custos_variaveis'
  | 'caixa'
  | 'receber'
  | 'receber_aberto'
  | 'a_pagar'
  | 'meta'
  | 'equilibrio'
  | 'cobre_fixos'
  | 'produto_top'
  | 'produto_pior'
  | 'linhas'
  | 'clientes'
  | 'saude'
  | 'prioridades'
  | 'projecao'
  | 'saidas'
  | 'ajuda'
  | 'desconhecido'

type IntentRule = {
  id: ChatIntentId
  /** Quanto maior, mais específico (desempate). */
  weight: number
  keywords: string[]
}

const RULES: IntentRule[] = [
  {
    id: 'ajuda',
    weight: 12,
    keywords: [
      'ajuda',
      'o que posso',
      'o que voce',
      'perguntas',
      'como usar',
      'opcoes',
      'menu',
      'comandos',
    ],
  },
  {
    id: 'receber_aberto',
    weight: 11,
    keywords: [
      'em aberto',
      'ainda nao pagou',
      'nao recebi',
      'pendente receber',
      'receber aberto',
      'quem deve',
      'quem me deve',
      'inadimpl',
      'atrasad',
    ],
  },
  {
    id: 'a_pagar',
    weight: 12,
    keywords: [
      'o que tenho que pagar',
      'tenho que pagar',
      'que pagar',
      'contas a pagar',
      'a pagar',
      'proximos pagamentos',
      'proximo pagamento',
      'proximas contas',
      'dividas',
      'divida',
      'que dia vence',
      'quando vence',
      'o que vence',
      'contas vencidas',
      'conta vencida',
      'vencimentos',
      'a vencer',
      'vai vencer',
      'preciso pagar',
      'devo pagar',
      'boletos',
      'boleto',
      'contas do mes',
      'pagar',
      'pagamento',
      'pagamentos',
      'vence',
      'vencimento',
    ],
  },
  {
    id: 'receber',
    weight: 10,
    keywords: [
      'contas a receber',
      'a receber',
      'receber',
      'recebimento',
      'cliente pag',
      'cobranca',
      'cobrar',
      'entrada prevista',
      'previsao de receb',
    ],
  },
  {
    id: 'produto_pior',
    weight: 10,
    keywords: [
      'menos rentavel',
      'pior produto',
      'pior margem',
      'produto ruim',
      'prejuizo produto',
      'produto no vermelho',
    ],
  },
  {
    id: 'produto_top',
    weight: 9,
    keywords: [
      'mais rentavel',
      'melhor produto',
      'produto top',
      'top produto',
      'qual produto',
      'produto lucra',
      'mix produto',
    ],
  },
  {
    id: 'linhas',
    weight: 9,
    keywords: [
      'por linha',
      'lucro por linha',
      'linha mais',
      'temperado',
      'gold',
      'suprema',
      'fachada',
      'ranking linha',
      'mix de linha',
      'qual linha',
    ],
  },
  {
    id: 'clientes',
    weight: 9,
    keywords: [
      'cliente',
      'por cliente',
      'melhor cliente',
      'top cliente',
      'quem comprou',
      'ranking cliente',
    ],
  },
  {
    id: 'custos_variaveis',
    weight: 9,
    keywords: [
      'custo variavel',
      'custos variaveis',
      'material',
      'vidro',
      'aluminio',
      'perfil',
      'insumo',
      'gasto da venda',
      'custo de obra',
    ],
  },
  {
    id: 'custos_fixos',
    weight: 9,
    keywords: [
      'custo fixo',
      'custos fixos',
      'despesa fixa',
      'despesas fixas',
      'aluguel',
      'folha',
      'energia',
      'fixo do mes',
      'recorrente',
    ],
  },
  {
    id: 'caixa',
    weight: 9,
    keywords: [
      'caixa',
      'fluxo de caixa',
      'dinheiro',
      'entrou',
      'saiu',
      'saldo',
      'cash',
      'liquidez',
    ],
  },
  {
    id: 'saidas',
    weight: 8,
    keywords: ['saida', 'saidas', 'paguei', 'ja paguei', 'contas pagas', 'saidas pagas'],
  },
  {
    id: 'cobre_fixos',
    weight: 10,
    keywords: [
      'cobre os fixos',
      'cobre fixo',
      'paga os fixos',
      'sobra ou falta',
      'folga de caixa',
      'apertado',
    ],
  },
  {
    id: 'equilibrio',
    weight: 9,
    keywords: [
      'ponto de equilibrio',
      'equilibrio',
      'break even',
      'zerar o mes',
      'minimo para',
    ],
  },
  {
    id: 'meta',
    weight: 8,
    keywords: ['meta', 'meta confortavel', 'objetivo', 'alvo de faturamento'],
  },
  {
    id: 'projecao',
    weight: 8,
    keywords: [
      'projecao',
      'proximo mes',
      'mes que vem',
      'previsao',
      'vai cobrir',
    ],
  },
  {
    id: 'margem',
    weight: 8,
    keywords: ['margem', 'margem de contribuicao', '%', 'percentual de lucro'],
  },
  {
    id: 'lucro',
    weight: 8,
    keywords: [
      'lucro',
      'resultado',
      'rentavel',
      'no azul',
      'no vermelho',
      'deficit',
      'prejuizo',
      'sobrou',
    ],
  },
  {
    id: 'faturamento',
    weight: 8,
    keywords: [
      'faturamento',
      'faturei',
      'faturou',
      'receita',
      'vendeu',
      'vendas',
      'quanto vendi',
      'quanto faturou',
      'quanto faturei',
    ],
  },
  {
    id: 'saude',
    weight: 8,
    keywords: [
      'saude',
      'nota',
      'como esta a empresa',
      'situacao financeira',
      'esta bem',
      'diagnostico',
    ],
  },
  {
    id: 'prioridades',
    weight: 9,
    keywords: [
      'o que fazer',
      'prioridade',
      'prioridades',
      'conselho',
      'recomend',
      'amanha',
      'atencao',
      'alerta',
      'checklist',
      'foc',
    ],
  },
  {
    id: 'resumo',
    weight: 6,
    keywords: [
      'resumo',
      'panorama',
      'visao geral',
      'como esta o mes',
      'como foi o mes',
      'balanco',
      'overview',
      'geral',
    ],
  },
]

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

export function normalizeChatText(input: string) {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s%]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resolve mês: atual | passado | YYYY-MM implícito. */
export function resolveMesFromText(
  text: string,
  base = new Date(),
): string | undefined {
  const n = normalizeChatText(text)
  if (
    n.includes('mes passado') ||
    n.includes('mes anterior') ||
    n.includes('ultimo mes')
  ) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 1, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }
  // "janeiro", "fevereiro"... do ano corrente/anterior simples
  const meses = [
    'janeiro',
    'fevereiro',
    'marco',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  for (let i = 0; i < meses.length; i += 1) {
    if (n.includes(meses[i]!)) {
      const year = base.getUTCFullYear()
      const cur = base.getUTCMonth()
      const y = i > cur ? year - 1 : year
      return `${y}-${String(i + 1).padStart(2, '0')}`
    }
  }
  return undefined
}

export function detectChatIntent(input: string): {
  intent: ChatIntentId
  score: number
} {
  const n = normalizeChatText(input)
  if (!n) return { intent: 'desconhecido', score: 0 }

  let best: { intent: ChatIntentId; score: number } = {
    intent: 'desconhecido',
    score: 0,
  }

  for (const rule of RULES) {
    let hits = 0
    for (const kw of rule.keywords) {
      if (n.includes(kw)) hits += 1
    }
    if (hits === 0) continue
    const score = hits * 10 + rule.weight
    if (score > best.score) {
      best = { intent: rule.id, score }
    }
  }

  // Limiar mínimo: 1 keyword fraca no resumo ainda passa; senão desconhecido
  if (best.score < 16) return { intent: 'desconhecido', score: best.score }
  return best
}

function money(v: number) {
  return formatCurrency(v)
}

function mesLabel(mes: string) {
  return capitalize(formatMonthLabel(mes))
}

function saudeNota(painel: PainelSocios): number {
  const r = painel.resultado
  const fluxo = painel.fluxoCaixa
  let nota = 50
  if (r.lucrativo) nota += 18
  else nota -= 14
  if (r.margemPercentual >= 35) nota += 16
  else if (r.margemPercentual >= 20) nota += 10
  else if (r.margemPercentual >= 10) nota += 4
  else if (r.margemPercentual < 0) nota -= 16
  const fixasPct =
    r.faturamento > 0 ? (r.custosFixos / r.faturamento) * 100 : 40
  if (fixasPct <= 20) nota += 10
  else if (fixasPct <= 30) nota += 4
  else if (fixasPct > 45) nota -= 10
  if (fluxo?.caixaPositivoRealizado) nota += 8
  else if (fluxo && !fluxo.caixaPositivoPrevisto) nota -= 8
  if (painel.projecao.cobreCustosFixos) nota += 6
  else nota -= 6
  return Math.max(0, Math.min(100, Math.round(nota)))
}

function saudeLabel(nota: number) {
  if (nota >= 80) return 'excelente'
  if (nota >= 65) return 'boa'
  if (nota >= 50) return 'estável'
  if (nota >= 35) return 'atenta'
  return 'crítica'
}

/** Respostas sempre a partir do painel já filtrado pela empresa do JWT. */
export function answerFromPainel(
  intent: ChatIntentId,
  painel: PainelSocios,
): string {
  const mes = mesLabel(painel.mes)
  const r = painel.resultado
  const fluxo = painel.fluxoCaixa
  const receber = painel.contasAReceber
  const rent = painel.rentabilidade
  const proj = painel.projecao

  switch (intent) {
    case 'resumo':
      return [
        `Resumo de ${mes} — só dados da sua empresa:`,
        `• Faturamento: ${money(r.faturamento)}`,
        `• Custos variáveis: ${money(r.custosVariaveis)}`,
        `• Custos fixos: ${money(r.custosFixos)}`,
        `• Lucro operacional: ${money(r.lucroOperacional)} (${r.lucrativo ? 'lucrativo' : 'deficitário'})`,
        `• Margem de contribuição: ${r.margemPercentual.toFixed(1).replace('.', ',')}%`,
        fluxo
          ? `• Saldo de caixa realizado: ${money(fluxo.saldoRealizado)}`
          : null,
        receber
          ? `• A receber em aberto: ${money(receber.totalEmAberto)}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')

    case 'faturamento':
      return [
        `Faturamento em ${mes}: ${money(r.faturamento)}.`,
        `Isso é o que foi vendido (DRE) na sua empresa — não confundir com o que já entrou no caixa.`,
        proj.metaConfortavelFaturamento != null
          ? `Meta confortável: ${money(proj.metaConfortavelFaturamento)} (${r.faturamento >= proj.metaConfortavelFaturamento ? 'atingida ou acima' : 'ainda abaixo'}).`
          : null,
      ]
        .filter(Boolean)
        .join('\n')

    case 'lucro':
      return [
        `Lucro operacional em ${mes}: ${money(r.lucroOperacional)}.`,
        r.lucrativo
          ? 'A operação está no azul no DRE (vendas − variáveis − fixos).'
          : 'A operação está no vermelho no DRE. Revise preço, desperdício de material e peso dos fixos.',
        `Margem de contribuição: ${money(r.margemContribuicao)} (${r.margemPercentual.toFixed(1).replace('.', ',')}%).`,
      ].join('\n')

    case 'margem':
      return [
        `Margem de contribuição em ${mes}: ${r.margemPercentual.toFixed(1).replace('.', ',')}% (${money(r.margemContribuicao)}).`,
        `Faturamento ${money(r.faturamento)} − custos variáveis ${money(r.custosVariaveis)}.`,
        r.margemPercentual >= 30
          ? 'Leitura: margem saudável para vidraçaria — dá para cobrir fixos com mais folga.'
          : 'Leitura: margem apertada — revise preço de box/fachada e consumo de vidro/perfil.',
      ].join('\n')

    case 'custos_fixos': {
      const itens = painel.custosFixos.itens.slice(0, 6)
      const vigentes = painel.custosFixos.vigentes?.slice(0, 6) ?? []
      const linhas =
        vigentes.length > 0
          ? vigentes.map((v) => `• ${v.descricao}: ${money(v.valorMensal)}`)
          : itens.map(
              (i) =>
                `• ${[i.categoria, i.subcategoria].filter(Boolean).join(' / ') || 'Custo'} — ${money(i.valorPrevisto)} (vence ${i.dataVencimento.split('-').reverse().join('/')})`,
            )
      return [
        `Custos fixos em ${mes}: ${money(painel.custosFixos.totalPrevisto || painel.custosFixos.totalMensalVigente || r.custosFixos)}.`,
        ...linhas,
        linhas.length === 0 ? 'Nenhum custo fixo listado neste período.' : null,
      ]
        .filter(Boolean)
        .join('\n')
    }

    case 'custos_variaveis':
      return [
        `Custos variáveis (material/obra) em ${mes}: ${money(r.custosVariaveis)}.`,
        r.faturamento > 0
          ? `Peso sobre o faturamento: ${((r.custosVariaveis / r.faturamento) * 100).toFixed(1).replace('.', ',')}%.`
          : 'Sem faturamento no mês, o peso percentual não se aplica.',
        'Esses custos vêm dos gastos lançados nas vendas (vidro, perfil, ferragem, silicone…).',
      ].join('\n')

    case 'caixa':
      if (!fluxo) {
        return `Ainda não há fluxo de caixa consolidado para ${mes} na sua empresa.`
      }
      return [
        `Fluxo de caixa em ${mes} (só a sua empresa):`,
        `• Entradas previstas: ${money(fluxo.entradasPrevistas)}`,
        `• Entradas recebidas: ${money(fluxo.entradasRecebidas)}`,
        `• Saídas previstas: ${money(fluxo.saidasPrevistas)}`,
        `• Saídas pagas: ${money(fluxo.saidasPagas)}`,
        `• Saldo previsto: ${money(fluxo.saldoPrevisto)}`,
        `• Saldo realizado: ${money(fluxo.saldoRealizado)}`,
        fluxo.caixaPositivoRealizado
          ? 'Caixa realizado no azul.'
          : fluxo.caixaPositivoPrevisto
            ? 'Caixa previsto positivo — confira o que ainda falta receber.'
            : 'Caixa apertado — priorize cobrança e segure compras.',
      ].join('\n')

    case 'receber':
      if (!receber) {
        return `Não há contas a receber carregadas para ${mes}.`
      }
      return [
        `Contas a receber em ${mes}:`,
        `• Total previsto: ${money(receber.totalPrevisto)}`,
        `• Já recebido: ${money(receber.totalRecebido)}`,
        `• Em aberto: ${money(receber.totalEmAberto)}`,
        ...receber.itens.slice(0, 5).map((i) => {
          const nome = i.cliente || 'Cliente'
          const venc = i.dataVencimento.split('-').reverse().join('/')
          return `• ${nome} — ${money(i.valorPrevisto)} · vence ${venc} · ${i.recebido ? 'Recebido' : 'Em aberto'}`
        }),
      ].join('\n')

    case 'receber_aberto': {
      if (!receber) {
        return `Não há contas a receber para ${mes}.`
      }
      const abertos = receber.itens.filter((i) => !i.recebido)
      if (!abertos.length) {
        return `Nenhuma conta em aberto em ${mes}. Tudo que estava previsto já foi marcado como Recebido (ou não havia previsão).`
      }
      return [
        `${abertos.length} conta(s) em aberto · ${money(receber.totalEmAberto)}:`,
        ...abertos.slice(0, 8).map((i) => {
          const nome = i.cliente || 'Cliente'
          const venc = i.dataVencimento.split('-').reverse().join('/')
          return `• ${nome} — ${money(i.valorPrevisto)} · venc. ${venc}`
        }),
        'No Glazia, só o Diretor marca Recebido na Análise.',
      ].join('\n')
    }

    case 'a_pagar': {
      // Fallback se a API dedicada não for chamada — usa custos fixos do mês.
      const hoje = new Date().toISOString().slice(0, 10)
      const abertos = painel.custosFixos.itens.filter(
        (i) => (i.status ?? '').toUpperCase() !== 'PAGO',
      )
      if (!abertos.length) {
        return `Não há custos fixos em aberto listados em ${mes}. Se acabou de virar o mês, confira Despesas fixas — o ciclo “Pago” reabre no dia 1.`
      }
      const vencidas = abertos.filter((i) => i.dataVencimento.slice(0, 10) < hoje)
      const proximas = abertos.filter((i) => i.dataVencimento.slice(0, 10) >= hoje)
      const fmt = (i: (typeof abertos)[number]) => {
        const nome =
          [i.categoria, i.subcategoria].filter(Boolean).join(' / ') || 'Conta'
        const venc = i.dataVencimento.split('-').reverse().join('/')
        return `• ${nome} — ${money(i.valorPrevisto)} · vence ${venc}`
      }
      return [
        `Contas a pagar (${mes}):`,
        vencidas.length
          ? `Vencidas em aberto (${vencidas.length}):\n${vencidas.slice(0, 6).map(fmt).join('\n')}`
          : null,
        proximas.length
          ? `Próximas (${proximas.length}):\n${proximas.slice(0, 6).map(fmt).join('\n')}`
          : null,
        `Total em aberto neste painel: ${money(abertos.reduce((s, i) => s + i.valorPrevisto, 0))}.`,
      ]
        .filter(Boolean)
        .join('\n\n')
    }

    case 'meta':
      return [
        `Metas ligadas a ${mes}:`,
        `• Meta confortável: ${proj.metaConfortavelFaturamento == null ? '—' : money(proj.metaConfortavelFaturamento)}`,
        `• Faturamento atual: ${money(r.faturamento)}`,
        proj.metaConfortavelFaturamento != null
          ? `• Falta / sobra vs meta: ${money(r.faturamento - proj.metaConfortavelFaturamento)}`
          : null,
        proj.regraMeta ? `Regra: ${proj.regraMeta}` : null,
      ]
        .filter(Boolean)
        .join('\n')

    case 'equilibrio':
      return [
        `Ponto de equilíbrio em ${mes}: ${proj.pontoEquilibrioFaturamento == null ? '—' : money(proj.pontoEquilibrioFaturamento)}.`,
        `É o faturamento mínimo para zerar o mês (cobrir variáveis + fixos com a margem atual).`,
        proj.pontoEquilibrioFaturamento != null
          ? r.faturamento >= proj.pontoEquilibrioFaturamento
            ? 'Você já passou do equilíbrio neste mês.'
            : `Faltam ${money(proj.pontoEquilibrioFaturamento - r.faturamento)} de faturamento para equilibrar.`
          : 'Sem margem base suficiente para calcular o equilíbrio.',
      ].join('\n')

    case 'cobre_fixos':
      return [
        proj.cobreCustosFixos
          ? `Sim — as entradas previstas cobrem os custos fixos (sobra ${money(proj.sobraOuFalta)}).`
          : `Não — ainda falta ${money(Math.abs(proj.sobraOuFalta))} para cobrir os fixos com as entradas previstas.`,
        `Entradas previstas: ${money(proj.entradasPrevistas)} · Fixos previstos: ${money(proj.custosFixosPrevistos)}.`,
      ].join('\n')

    case 'produto_top':
      return rent.maisRentavel
        ? [
            `Produto mais rentável em ${mes}: ${rent.maisRentavel.produto}.`,
            `• Lucro: ${money(rent.maisRentavel.lucro)}`,
            `• Receita: ${money(rent.maisRentavel.receita)}`,
            rent.maisRentavel.linha
              ? `• Linha: ${rent.maisRentavel.linha}`
              : null,
            `• Vendas: ${rent.maisRentavel.qtdVendas}`,
            'Sugestão: priorize orçamentos desse mix (box, temperado, etc.) enquanto a margem estiver boa.',
          ]
            .filter(Boolean)
            .join('\n')
        : `Ainda não há produto com rentabilidade calculável em ${mes}. Lance vendas com custos atrelados.`

    case 'produto_pior':
      return rent.menosRentavel
        ? [
            `Produto com pior lucro em ${mes}: ${rent.menosRentavel.produto}.`,
            `• Lucro: ${money(rent.menosRentavel.lucro)}`,
            `• Receita: ${money(rent.menosRentavel.receita)}`,
            'Revise preço, desperdício de vidro/perfil ou tempo de instalação nesse item.',
          ].join('\n')
        : `Sem recorte de produto fraco em ${mes}.`

    case 'linhas': {
      const top = [...(rent.porLinha ?? [])]
        .sort((a, b) => b.lucro - a.lucro)
        .slice(0, 6)
      if (!top.length) {
        return `Ainda não há lucro por linha em ${mes}.`
      }
      return [
        `Lucro por linha em ${mes}:`,
        ...top.map(
          (l, i) =>
            `${i + 1}. ${l.linha} — lucro ${money(l.lucro)} · receita ${money(l.receita)}`,
        ),
        'Use isso para decidir o que empurrar na vitrine e no WhatsApp comercial.',
      ].join('\n')
    }

    case 'clientes': {
      const top = [...(rent.porCliente ?? [])]
        .sort((a, b) => b.lucro - a.lucro)
        .slice(0, 6)
      if (!top.length) {
        return `Ainda não há ranking de clientes em ${mes}. Cadastre clientes nas vendas.`
      }
      return [
        `Top clientes em ${mes} (pela sua base):`,
        ...top.map(
          (c, i) =>
            `${i + 1}. ${c.cliente} — lucro ${money(c.lucro)} · ${c.qtdVendas} venda(s)`,
        ),
      ].join('\n')
    }

    case 'saude': {
      const nota = saudeNota(painel)
      return [
        `Saúde financeira de ${mes}: ${nota}/100 — situação ${saudeLabel(nota)}.`,
        `• DRE: ${r.lucrativo ? 'lucrativo' : 'deficitário'} (${money(r.lucroOperacional)})`,
        `• Margem: ${r.margemPercentual.toFixed(1).replace('.', ',')}%`,
        fluxo
          ? `• Caixa realizado: ${fluxo.caixaPositivoRealizado ? 'positivo' : 'apertado'} (${money(fluxo.saldoRealizado)})`
          : null,
        `• Cobre fixos (previsto)? ${proj.cobreCustosFixos ? 'Sim' : 'Não'}`,
      ]
        .filter(Boolean)
        .join('\n')
    }

    case 'prioridades': {
      const topLinha = [...(rent.porLinha ?? [])].sort(
        (a, b) => b.lucro - a.lucro,
      )[0]
      const aberto = receber?.totalEmAberto ?? 0
      return [
        `Prioridades para a sua vidraçaria com base em ${mes}:`,
        aberto > 0
          ? `1. Cobrar ${money(aberto)} em aberto — vá em Análise → Contas a receber.`
          : '1. Contas a receber em dia — mantenha o ritmo de marcar Recebido.',
        !proj.cobreCustosFixos
          ? `2. Fechar vendas: ainda falta ${money(Math.abs(proj.sobraOuFalta))} para cobrir os fixos.`
          : '2. Fixos cobertos na previsão — preserve reserva de caixa.',
        topLinha
          ? `3. Empurrar a linha ${topLinha.linha} (lucro ${money(topLinha.lucro)}).`
          : '3. Lance vendas com custos para enxergar o mix.',
        rent.menosRentavel
          ? `4. Revisar preço/desperdício em ${rent.menosRentavel.produto}.`
          : '4. Revisar o top de custos fixos se o mês apertar.',
      ].join('\n')
    }

    case 'projecao':
      return [
        `Projeção a partir de ${mes} → ${mesLabel(proj.mesProjecao)}:`,
        `• Entradas previstas: ${money(proj.entradasPrevistas)}`,
        `• Custos fixos previstos: ${money(proj.custosFixosPrevistos)}`,
        `• Cobre os fixos? ${proj.cobreCustosFixos ? 'Sim' : 'Não'}`,
        `• Sobra/falta: ${money(proj.sobraOuFalta)}`,
        `• Ponto de equilíbrio: ${proj.pontoEquilibrioFaturamento == null ? '—' : money(proj.pontoEquilibrioFaturamento)}`,
        `• Meta confortável: ${proj.metaConfortavelFaturamento == null ? '—' : money(proj.metaConfortavelFaturamento)}`,
      ].join('\n')

    case 'saidas':
      if (!fluxo) {
        return `Sem dados de saídas de caixa para ${mes}.`
      }
      return [
        `Saídas de caixa em ${mes}:`,
        `• Previstas: ${money(fluxo.saidasPrevistas)}`,
        `• Já pagas: ${money(fluxo.saidasPagas)}`,
        `Inclui custos fixos quitados e outras saídas registradas no fluxo da sua empresa.`,
      ].join('\n')

    case 'ajuda':
      return [
        'Posso consultar apenas os números da sua empresa (nunca de outro cliente Glazia).',
        '',
        'Exemplos do que perguntar:',
        '• Quanto faturei? / Lucro do mês',
        '• Como está o caixa? / Quem me deve?',
        '• O que tenho que pagar? / Próximos vencimentos',
        '• Custos fixos / custos de material',
        '• Qual linha ou produto mais lucra?',
        '• Meta, ponto de equilíbrio, cobre os fixos?',
        '• Saúde financeira / o que fazer amanhã',
        '• Mês passado / janeiro (quando fizer sentido)',
        '',
        'Também pode usar os atalhos abaixo.',
      ].join('\n')

    case 'desconhecido':
    default:
      return [
        'Não entendi essa pergunta com segurança.',
        'Tente algo como: “quanto faturei?”, “quem me deve?”, “o que tenho que pagar?”, “lucro por linha”, “como está o caixa?” ou “meta do mês”.',
        'Ou toque em um dos atalhos — continuo usando só os dados da sua empresa.',
      ].join('\n')
  }
}

export type ContaAPagarResumo = {
  hoje: string
  horizonteDias: number
  itens: Array<{
    dataVencimento: string
    valorPrevisto: number
    descricao: string | null
    categoria: string | null
    subcategoria: string | null
    vencida: boolean
  }>
  vencidas: Array<{
    dataVencimento: string
    valorPrevisto: number
    descricao: string | null
    categoria: string | null
    subcategoria: string | null
    vencida: boolean
  }>
  proximas: Array<{
    dataVencimento: string
    valorPrevisto: number
    descricao: string | null
    categoria: string | null
    subcategoria: string | null
    vencida: boolean
  }>
  total: number
  totalVencido: number
  totalProximo: number
}

export function answerContasAPagar(data: ContaAPagarResumo): string {
  if (!data.itens.length) {
    return [
      'Nenhuma conta a pagar em aberto no horizonte consultado.',
      'Se houver custos fixos cadastrados, eles só entram aqui enquanto a parcela do mês não estiver marcada como Paga.',
    ].join('\n')
  }

  const fmt = (i: ContaAPagarResumo['itens'][number]) => {
    const nome =
      i.descricao ||
      [i.categoria, i.subcategoria].filter(Boolean).join(' / ') ||
      'Conta'
    const venc = i.dataVencimento.split('-').reverse().join('/')
    return `• ${nome} — ${money(i.valorPrevisto)} · ${i.vencida ? 'VENCIDA' : 'vence'} ${venc}`
  }

  return [
    'O que você tem a pagar (só da sua empresa):',
    data.vencidas.length
      ? `Vencidas em aberto · ${money(data.totalVencido)}\n${data.vencidas.slice(0, 8).map(fmt).join('\n')}`
      : 'Nenhuma conta vencida em aberto.',
    data.proximas.length
      ? `Próximos ${data.horizonteDias} dias · ${money(data.totalProximo)}\n${data.proximas.slice(0, 8).map(fmt).join('\n')}`
      : null,
    `Total a pagar: ${money(data.total)}.`,
    'No Glazia, o Diretor marca cada custo fixo como Pago em Despesas fixas.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const CHAT_EQUIPE_HINTS = [
  'quanto faturei?',
  'como está o caixa?',
  'quem me deve?',
  'o que tenho que pagar?',
  'lucro por linha',
  'custos fixos',
  'meta do mês',
  'saúde financeira',
  'o que fazer amanhã?',
]
