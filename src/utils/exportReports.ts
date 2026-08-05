import type { PainelSocios } from '../types'
import { capitalize, formatMonthLabel } from './format'

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function mesLabel(mes: string) {
  return capitalize(formatMonthLabel(mes))
}

export async function exportarPainelExcel(painel: PainelSocios) {
  const XLSX = await import('xlsx')
  const { resultado, rentabilidade, custosFixos, projecao } = painel

  const workbook = XLSX.utils.book_new()

  const resumo = [
    ['Mês', mesLabel(painel.mes)],
    ['Faturamento', resultado.faturamento],
    ['Custos variáveis', resultado.custosVariaveis],
    ['Custos fixos', resultado.custosFixos],
    ['Margem de contribuição', resultado.margemContribuicao],
    ['Lucro operacional', resultado.lucroOperacional],
    ['Situação', resultado.lucrativo ? 'Lucrativo' : 'Deficitário'],
    [],
    ['Entradas previstas (próximo mês)', projecao.entradasPrevistas],
    ['Custos fixos previstos', projecao.custosFixosPrevistos],
    ['Cobre custos fixos?', projecao.cobreCustosFixos ? 'Sim' : 'Não'],
    ['Ponto de equilíbrio', projecao.pontoEquilibrioFaturamento],
    ['Meta confortável', projecao.metaConfortavelFaturamento],
  ]

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(resumo),
    'Resumo',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      rentabilidade.porProduto.map((item) => ({
        Produto: item.produto,
        Linha: item.linha,
        Receita: item.receita,
        Custo: item.custo,
        Lucro: item.lucro,
        'Qtd vendas': item.qtdVendas,
      })),
    ),
    'Produtos',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      custosFixos.itens.map((item) => ({
        Categoria: item.categoria,
        Subcategoria: item.subcategoria,
        Vencimento: item.dataVencimento,
        'Valor previsto': item.valorPrevisto,
        'Valor realizado': item.valorRealizado,
        Status: item.status,
      })),
    ),
    'Custos fixos',
  )

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  downloadBlob(
    `glazia-analise-${painel.mes}.xlsx`,
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
}

export async function exportarPainelPdf(
  painel: PainelSocios,
  opts?: { empresaNome?: string | null },
) {
  const { gerarRelatorioPdf } = await import('./pdfReport')
  await gerarRelatorioPdf(painel, opts)
}
