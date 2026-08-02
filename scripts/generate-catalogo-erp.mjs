/**
 * Catálogo ERP hierárquico Glazia
 * Produtos: Linha → Produto → Cor
 * Custos:   Tipo → Linha → Item
 *
 * node scripts/generate-catalogo-erp.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260802030200_0013_catalogo_hierarquico_reseed.sql',
)

const esc = (s) => String(s).replace(/'/g, "''")
const q = (s) => (s == null ? 'NULL' : `'${esc(s)}'`)

// —— Cores de mercado (perfil / vidro) ——
const CORES_PERFIL = [
  'BRANCO',
  'BRANCO FOSCO',
  'PRETO',
  'PRETO FOSCO',
  'BRONZE',
  'CHAMPAGNE',
  'NATURAL/ALUMÍNIO',
  'PRATA',
  'GRAFITE',
  'MARROM',
  'CINZA',
  'BEGE',
  'AÇO CORTEN',
  'ANODIZADO NATURAL',
  'ANODIZADO PRETO',
  'GOLD ROSE',
  'VERDE MUSGO',
  'AZUL MARINHO',
]

const CORES_VIDRO = [
  'INCOLOR',
  'EXTRA CLEAR',
  'FUMÊ',
  'VERDE',
  'BRONZE',
  'REFLETIVO PRATA',
  'REFLETIVO AZUL',
  'SERIGRAFADO BRANCO',
  'PINTADO PRETO',
  'JATEADO',
  'FOSCO ÁCIDO',
  'ESPELHO PRATA',
  'ESPELHO BRONZE',
]

const CORES_ACM = [
  'BRANCO',
  'PRETO',
  'PRATA',
  'CHAMPAGNE',
  'BRONZE',
  'AÇO CORTEN',
  'GRAFITE',
  'AZUL MARINHO',
]

const CORES_INOX = ['ESCOVADO', 'POLIDO', 'PRETO', 'CHAMPAGNE', 'NATURAL/ALUMÍNIO']

// —— Produtos por família de linha ——
const PRODUTOS_ESQUADRIA = [
  ['PORTA DE CORRER', 'PORTA', 'ESQUADRIA', 'UN'],
  ['PORTA DE GIRO', 'PORTA', 'ESQUADRIA', 'UN'],
  ['PORTA PIVOTANTE', 'PORTA', 'ESQUADRIA', 'UN'],
  ['PORTA CAMARÃO', 'PORTA', 'ESQUADRIA', 'UN'],
  ['PORTA ARTICULADA', 'PORTA', 'ESQUADRIA', 'UN'],
  ['PORTA BALCÃO', 'PORTA', 'ESQUADRIA', 'UN'],
  ['PORTA DE ABRIR', 'PORTA', 'ESQUADRIA', 'UN'],
  ['PORTA SANFONADA', 'PORTA', 'ESQUADRIA', 'UN'],
  ['JANELA DE CORRER', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA DE GIRO', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA MAXIM-AR', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA BASCULANTE', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA PROJETANTE', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA OSCILO-BATENTE', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA TOMBANTE', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA INTEGRADA', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA PIVOTANTE', 'JANELA', 'ESQUADRIA', 'UN'],
  ['JANELA FIXA', 'JANELA', 'ESQUADRIA', 'UN'],
  ['VENEZIANA', 'JANELA', 'ESQUADRIA', 'UN'],
  ['PORTÃO DE ALUMÍNIO', 'PORTAO', 'ESQUADRIA', 'UN'],
  ['FECHAMENTO DE SACADA', 'SACADA', 'FECHAMENTO', 'M2'],
  ['FECHAMENTO DE VARANDA', 'SACADA', 'FECHAMENTO', 'M2'],
  ['FECHAMENTO DE ÁREA', 'SACADA', 'FECHAMENTO', 'M2'],
  ['DIVISÓRIA', 'DIVISORIA', 'FECHAMENTO', 'M2'],
  ['ESQUADRIA ESPECIAL', 'ESPECIAL', 'ESPECIAL', 'UN'],
]

const PRODUTOS_TEMPERADO = [
  ['BOX FRONTAL', 'BOX', 'BOX', 'UN'],
  ['BOX DE CANTO', 'BOX', 'BOX', 'UN'],
  ['BOX ARTICULADO', 'BOX', 'BOX', 'UN'],
  ['BOX DE ABRIR', 'BOX', 'BOX', 'UN'],
  ['BOX COM NICHO', 'BOX', 'BOX', 'UN'],
  ['PORTA DE VIDRO TEMPERADO', 'PORTA', 'VIDRO_AVULSO', 'UN'],
  ['ESPELHO', 'ESPELHO', 'DECORATIVO', 'M2'],
  ['ESPELHO COM LED', 'ESPELHO', 'DECORATIVO', 'UN'],
  ['ESPELHO BISOTADO', 'ESPELHO', 'DECORATIVO', 'M2'],
  ['VIDRO SERIGRAFADO', 'VIDRO_DECOR', 'DECORATIVO', 'M2'],
  ['VIDRO JATEADO', 'VIDRO_DECOR', 'DECORATIVO', 'M2'],
  ['VIDRO PINTADO', 'VIDRO_DECOR', 'DECORATIVO', 'M2'],
  ['VIDRO IMPRESSO', 'VIDRO_DECOR', 'DECORATIVO', 'M2'],
  ['VIDRO LAMINADO', 'VIDRO_TEC', 'ESTRUTURAL', 'M2'],
  ['VIDRO ACÚSTICO', 'VIDRO_TEC', 'ESTRUTURAL', 'M2'],
  ['VIDRO BLINDADO', 'VIDRO_TEC', 'ESPECIAL', 'M2'],
  ['VIDRO INTELIGENTE', 'VIDRO_TEC', 'ESPECIAL', 'M2'],
  ['VIDRO LOW-E', 'VIDRO_TEC', 'ESTRUTURAL', 'M2'],
  ['VIDRO INSULADO', 'VIDRO_TEC', 'ESTRUTURAL', 'M2'],
  ['TAMPO', 'MOVEL', 'MOBILIARIO', 'M2'],
  ['PRATELEIRA', 'MOVEL', 'MOBILIARIO', 'ML'],
  ['MESA VIDRO', 'MOVEL', 'MOBILIARIO', 'UN'],
  ['PAINEL DE VIDRO', 'PAINEL', 'FECHAMENTO', 'M2'],
  ['MOLDURA DE VIDRO', 'MOLDURA', 'DECORATIVO', 'ML'],
  ['CLARABÓIA', 'CLARABOIA', 'ESTRUTURAL', 'UN'],
]

const PRODUTOS_FACHADA = [
  ['FACHADA', 'FACHADA', 'ESTRUTURAL', 'M2'],
  ['PELE DE VIDRO', 'PELE_VIDRO', 'ESTRUTURAL', 'M2'],
  ['COBERTURA', 'COBERTURA', 'ESTRUTURAL', 'M2'],
  ['COBERTURA RETRÁTIL', 'COBERTURA', 'ESTRUTURAL', 'M2'],
  ['GUARDA-CORPO', 'GUARDA_CORPO', 'ESTRUTURAL', 'ML'],
  ['PERGOLADO', 'PERGOLADO', 'ESTRUTURAL', 'M2'],
  ['CLARABÓIA', 'CLARABOIA', 'ESTRUTURAL', 'UN'],
  ['DIVISÓRIA ESCRITÓRIO', 'DIVISORIA', 'FECHAMENTO', 'M2'],
  ['VIDRO INSULADO', 'VIDRO_TEC', 'ESTRUTURAL', 'M2'],
  ['VIDRO LOW-E', 'VIDRO_TEC', 'ESTRUTURAL', 'M2'],
  ['VIDRO ACÚSTICO', 'VIDRO_TEC', 'ESTRUTURAL', 'M2'],
]

const PRODUTOS_ACM = [
  ['PAINEL ACM', 'ACM', 'ACM', 'M2'],
  ['BRISE ACM', 'BRISE', 'ACM', 'M2'],
  ['COBOGÓ ACM', 'BRISE', 'ACM', 'M2'],
  ['REVESTIMENTO ACM', 'ACM', 'ACM', 'M2'],
  ['PERGOLADO', 'PERGOLADO', 'ESTRUTURAL', 'M2'],
]

const PRODUTOS_AUTOMACAO = [
  ['PORTA AUTOMÁTICA DESLIZANTE', 'AUTOMATICO', 'AUTOMACAO', 'UN'],
  ['PORTA AUTOMÁTICA GIRATÓRIA', 'AUTOMATICO', 'AUTOMACAO', 'UN'],
  ['PORTÃO AUTOMÁTICO', 'PORTAO', 'AUTOMACAO', 'UN'],
]

const PRODUTOS_INOX = [
  ['GUARDA-CORPO', 'GUARDA_CORPO', 'ESTRUTURAL', 'ML'],
  ['CORRIMÃO', 'CORRIMAO', 'ESTRUTURAL', 'ML'],
  ['PRATELEIRA', 'MOVEL', 'MOBILIARIO', 'ML'],
]

/** Hierarquia: cada linha libera seus produtos e cores */
const ARVORE_LINHAS = [
  { linha: 'GOLD', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: 'SUPREMA', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: 'MASTER', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: 'INFINITY', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: 'MINIMALISTA', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: '25', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: '30', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: '42', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: '50', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: 'PVC', tipo: 'ALUMINIO', produtos: PRODUTOS_ESQUADRIA, cores: CORES_PERFIL },
  { linha: 'TEMPERADO', tipo: 'VIDRO', produtos: PRODUTOS_TEMPERADO, cores: CORES_VIDRO },
  { linha: 'FACHADA', tipo: 'ESTRUTURAL', produtos: PRODUTOS_FACHADA, cores: [...CORES_PERFIL, ...CORES_VIDRO] },
  { linha: 'ACM', tipo: 'ACM', produtos: PRODUTOS_ACM, cores: CORES_ACM },
  { linha: 'AUTOMACAO', tipo: 'AUTOMACAO', produtos: PRODUTOS_AUTOMACAO, cores: CORES_PERFIL },
  { linha: 'INOX', tipo: 'INOX', produtos: PRODUTOS_INOX, cores: CORES_INOX },
]

function marcaLinha(linha) {
  if (['GOLD', 'SUPREMA', 'MASTER', 'INFINITY', 'MINIMALISTA'].includes(linha)) return 'HYDRO'
  if (linha === 'TEMPERADO' || linha === 'FACHADA') return 'CEBRACE'
  if (linha === 'AUTOMACAO') return 'PPA'
  if (linha === 'PVC') return 'GENERICA'
  return 'CBC'
}

function acabamentoCor(cor) {
  if (cor.includes('FOSCO') || cor.includes('JATEADO')) return 'FOSCO'
  if (cor.includes('ANODIZADO') || cor.includes('ESCOVADO') || cor.includes('POLIDO'))
    return 'ANODIZACAO'
  if (cor.includes('NATURAL')) return 'NATURAL'
  return 'PINTURA_ELETROSTATICA'
}

function buildProdutos() {
  const rows = []
  for (const no of ARVORE_LINHAS) {
    const cores = [...new Set(no.cores)]
    for (const [produto, familia, categoria, unidade] of no.produtos) {
      for (const cor of cores) {
        rows.push({
          linha: no.linha,
          produto,
          cor,
          categoria,
          descricao: `${produto} · linha ${no.linha} · ${cor}`,
          unidade_venda: unidade,
          familia,
          marca: marcaLinha(no.linha),
          acabamento: acabamentoCor(cor),
          segmento: ['FACHADA', 'ACM', 'AUTOMACAO'].includes(no.linha)
            ? 'COMERCIAL'
            : 'RESIDENCIAL',
          codigo_interno: `SKU-${String(rows.length + 1).padStart(5, '0')}`,
        })
      }
    }
  }
  return rows
}

function buildCustos() {
  const rows = []
  const push = (row) => {
    rows.push({
      codigo_interno: `CST-${String(rows.length + 1).padStart(5, '0')}`,
      origem: row.origem ?? 'COMPRA',
      marca: row.marca ?? 'GENERICA',
      ...row,
    })
  }

  const linhasAluminio = ARVORE_LINHAS.filter((l) => l.tipo === 'ALUMINIO').map((l) => l.linha)

  // VIDRO — hierarquia: tipo → linha TEMPERADO/FACHADA → item
  const vidros = [
    ['FLOAT', ['3MM', '4MM', '5MM', '6MM'], ['INCOLOR', 'FUMÊ', 'VERDE', 'BRONZE']],
    ['TEMPERADO', ['6MM', '8MM', '10MM', '12MM', '15MM', '19MM'], CORES_VIDRO],
    ['LAMINADO', ['6MM', '8MM', '10MM', '12MM'], ['INCOLOR', 'FUMÊ', 'VERDE', 'EXTRA CLEAR']],
    ['INSULADO', ['12MM', '15MM', '19MM'], ['INCOLOR', 'FUMÊ']],
    ['SERIGRAFADO', ['6MM', '8MM', '10MM'], ['SERIGRAFADO BRANCO', 'INCOLOR']],
    ['JATEADO', ['6MM', '8MM', '10MM'], ['JATEADO', 'INCOLOR']],
    ['PINTADO', ['6MM', '8MM', '10MM'], ['PINTADO PRETO', 'INCOLOR']],
    ['REFLETIVO', ['6MM', '8MM', '10MM'], ['REFLETIVO PRATA', 'REFLETIVO AZUL']],
    ['LOW_E', ['6MM', '8MM', '10MM'], ['INCOLOR', 'EXTRA CLEAR']],
    ['ACUSTICO', ['8MM', '10MM', '12MM'], ['INCOLOR', 'FUMÊ']],
    ['BLINDADO', ['22MM', '25MM'], ['INCOLOR']],
    ['INTELIGENTE', ['10MM', '12MM'], ['INCOLOR']],
    ['IMPRESSO', ['8MM', '10MM'], ['INCOLOR']],
    ['EXTRA_CLEAR', ['6MM', '8MM', '10MM', '12MM'], ['EXTRA CLEAR']],
  ]
  for (const linha of ['TEMPERADO', 'FACHADA']) {
    for (const [tipoVidro, esps, cores] of vidros) {
      for (const esp of esps) {
        for (const cor of cores) {
          const especial = ['ACUSTICO', 'BLINDADO', 'INTELIGENTE', 'IMPRESSO', 'LOW_E'].includes(
            tipoVidro,
          )
          push({
            tipo_custo: especial ? 'VIDRO_ESPECIAL' : 'VIDRO',
            subtipo: tipoVidro,
            descricao: `Vidro ${tipoVidro.toLowerCase()} ${esp} ${cor}`,
            linha,
            cor,
            espessura: esp,
            tipo_vidro: tipoVidro,
            unidade_custo: 'M2',
            marca: 'CEBRACE',
          })
        }
      }
    }
  }

  // PERFIL — tipo → linha → item
  const tiposPerfil = [
    'Perfil batente',
    'Perfil folha',
    'Perfil montante',
    'Trilho superior',
    'Trilho inferior',
    'Pingadeira',
    'Contra-marco',
  ]
  const bitolas = ['25MM', '32MM', '42MM', '50MM']
  for (const linha of linhasAluminio) {
    for (const cor of CORES_PERFIL) {
      for (const bitola of bitolas) {
        for (const tipo of tiposPerfil) {
          push({
            tipo_custo: 'PERFIL',
            subtipo: tipo.toUpperCase().replace(/\s+/g, '_'),
            descricao: `${tipo} ${bitola} ${cor}`,
            linha,
            cor,
            espessura: bitola,
            unidade_custo: 'ML',
            marca: marcaLinha(linha),
            acabamento: acabamentoCor(cor),
          })
        }
      }
    }
  }

  // PERFIL PVC
  for (const cor of ['BRANCO', 'PRETO', 'MARROM', 'CINZA']) {
    for (const item of ['Perfil batente PVC', 'Perfil folha PVC', 'Reforço aço PVC']) {
      push({
        tipo_custo: 'PERFIL_PVC',
        subtipo: 'PVC',
        descricao: `${item} ${cor}`,
        linha: 'PVC',
        cor,
        unidade_custo: 'ML',
      })
    }
  }

  // FACHADA / INOX / ACM / AUTOMACAO materiais
  for (const [tipo, desc, un, linha, cor] of [
    ['PERFIL_ESTRUTURAL', 'Tubo alumínio 2"', 'ML', 'FACHADA', 'NATURAL/ALUMÍNIO'],
    ['PERFIL_ESTRUTURAL', 'Cantoneira alumínio 1"', 'ML', 'FACHADA', 'NATURAL/ALUMÍNIO'],
    ['PERFIL_ESTRUTURAL', 'Chapa alumínio 3mm', 'M2', 'FACHADA', 'NATURAL/ALUMÍNIO'],
    ['INOX', 'Tubo inox 304 1.1/2"', 'ML', 'INOX', 'ESCOVADO'],
    ['INOX', 'Tubo inox 316 2"', 'ML', 'INOX', 'POLIDO'],
    ['INOX', 'Suporte guarda-corpo inox', 'UN', 'INOX', 'ESCOVADO'],
    ['INOX', 'Terminal cabo aço', 'UN', 'INOX', 'ESCOVADO'],
    ['ACESSORIO', 'Painel ACM 4mm PE', 'M2', 'ACM', 'BRANCO'],
    ['ACESSORIO', 'Painel ACM 4mm PVDF', 'M2', 'ACM', 'PRETO'],
    ['ACESSORIO', 'Perfil U ACM', 'ML', 'ACM', 'PRATA'],
    ['AUTOMACAO', 'Motor deslizante 1/4 HP', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Motor deslizante 1/2 HP', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Motor basculante', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Sensor infravermelho', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Fotocélula', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Central de comando', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Fonte 24V', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Cabo PP 3x1,5', 'ML', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Controle remoto', 'UN', 'AUTOMACAO', null],
    ['AUTOMACAO', 'Bateria backup', 'UN', 'AUTOMACAO', null],
  ]) {
    push({
      tipo_custo: tipo,
      subtipo: tipo,
      descricao: desc,
      linha,
      cor,
      unidade_custo: un,
      marca: linha === 'AUTOMACAO' ? 'PPA' : 'GENERICA',
    })
  }

  // Ferragens / acessórios — por linha de esquadria
  const ferragens = [
    'Roldana simples',
    'Roldana dupla',
    'Roldana regulável',
    'Fecho maxim-ar',
    'Fecho concha',
    'Fechadura multiponto',
    'Dobradiça pivotante',
    'Mola aérea',
    'Mola de piso',
    'Pivô superior',
    'Pivô inferior',
    'Braço projetante',
    'Kit camarão',
    'Kit porta de correr',
    'Trinco',
    'Cremona',
  ]
  for (const linha of ['GOLD', 'SUPREMA', 'MASTER', 'INFINITY', 'TEMPERADO']) {
    for (const f of ferragens) {
      for (const cor of ['PRETO', 'BRANCO', 'CHAMPAGNE', 'INCOLOR']) {
        push({
          tipo_custo: 'FERRAGEM',
          subtipo: 'FERRAGEM',
          descricao: `${f} ${cor.toLowerCase()}`,
          linha,
          cor,
          unidade_custo: 'UN',
          marca: 'ROSA',
        })
      }
    }
  }

  for (const linha of ['TEMPERADO', 'GOLD', 'SUPREMA']) {
    for (const a of [
      'Puxador retilíneo 300mm',
      'Puxador retilíneo 600mm',
      'Puxador curvo',
      'Kit box frontal',
      'Kit box articulado',
      'Conector vidro-vidro',
      'Conector vidro-parede',
    ]) {
      for (const cor of ['PRETO', 'INCOLOR', 'BRANCO']) {
        push({
          tipo_custo: 'ACESSORIO',
          subtipo: 'ACESSORIO',
          descricao: `${a} ${cor.toLowerCase()}`,
          linha,
          cor,
          unidade_custo: 'UN',
        })
      }
    }
  }

  // Demais tipos — linha GERAL (sempre aparece na cascata Tipo → Linha → Item)
  const gerais = [
    ['SILICONE', 'Silicone neutro transparente', 'UN'],
    ['SILICONE', 'Silicone neutro preto', 'UN'],
    ['SILICONE', 'Silicone estrutural', 'UN'],
    ['SILICONE', 'PU selante fachada', 'UN'],
    ['BORRACHA_VEDACAO', 'EPDM tubular', 'ML'],
    ['BORRACHA_VEDACAO', 'EPDM aba', 'ML'],
    ['BORRACHA_VEDACAO', 'Escova de vedação 5mm', 'ML'],
    ['BORRACHA_VEDACAO', 'Escova de vedação 7mm', 'ML'],
    ['BORRACHA_VEDACAO', 'Borracha box', 'ML'],
    ['FIXACAO', 'Parafuso 4,2x32', 'UN'],
    ['FIXACAO', 'Parafuso 4,8x50', 'UN'],
    ['FIXACAO', 'Parafuso inox 5x40', 'UN'],
    ['FIXACAO', 'Rebíte 4,8', 'UN'],
    ['FIXACAO', 'Bucha nylon S8', 'UN'],
    ['FIXACAO', 'Chumbador químico', 'UN'],
    ['FIXACAO', 'Chumbador mecânico', 'UN'],
    ['COLA_FITA', 'Fita dupla face estrutural VHB', 'ML'],
    ['COLA_FITA', 'Cola PU montagem', 'UN'],
    ['COLA_FITA', 'Cola espelho', 'UN'],
    ['COLA_FITA', 'Espaçador calço 3mm', 'UN'],
    ['COLA_FITA', 'Calço nivelador', 'UN'],
    ['CONSUMIVEL', 'Disco diamantado 110mm', 'UN'],
    ['CONSUMIVEL', "Lixa d'água 400", 'UN'],
    ['CONSUMIVEL', 'Álcool isopropílico', 'L'],
    ['ACABAMENTO_SUPERFICIE', 'Tinta touch-up branco', 'UN'],
    ['ACABAMENTO_SUPERFICIE', 'Polidor de vidro', 'UN'],
    ['ACABAMENTO_SUPERFICIE', 'Limpa-vidros concentrado', 'L'],
    ['EMBALAGEM', 'Cantoneira proteção papelão', 'UN'],
    ['EMBALAGEM', 'Filme stretch', 'UN'],
    ['EMBALAGEM', 'Plástico bolha', 'M2'],
    ['SERVICO', 'Instalação esquadria', 'UN'],
    ['SERVICO', 'Instalação box', 'UN'],
    ['SERVICO', 'Medição técnica', 'UN'],
    ['SERVICO', 'Manutenção corretiva', 'UN'],
    ['TERCEIRIZACAO', 'Têmpera de vidro', 'M2'],
    ['TERCEIRIZACAO', 'Laminação de vidro', 'M2'],
    ['TERCEIRIZACAO', 'Lapidação', 'ML'],
    ['TERCEIRIZACAO', 'Jateamento', 'M2'],
    ['TERCEIRIZACAO', 'Pintura eletrostática perfil', 'ML'],
    ['TERCEIRIZACAO', 'Anodização', 'ML'],
    ['TERCEIRIZACAO', 'Usinagem CNC', 'UN'],
    ['LOGISTICA', 'Frete urbano', 'UN'],
    ['LOGISTICA', 'Frete intermunicipal', 'UN'],
    ['LOGISTICA', 'Combustível frota', 'L'],
    ['LOGISTICA', 'Pedágio', 'UN'],
    ['LOGISTICA', 'Munck / guindaste', 'UN'],
    ['EPI_FERRAMENTA', 'Luva anticorte', 'UN'],
    ['EPI_FERRAMENTA', 'Óculos de proteção', 'UN'],
    ['EPI_FERRAMENTA', 'Botina segurança', 'UN'],
    ['EPI_FERRAMENTA', 'Locação andaime diária', 'UN'],
    ['PERDA_DESPERDICIO', 'Quebra de vidro', 'M2'],
    ['PERDA_DESPERDICIO', 'Retrabalho pintura', 'UN'],
    ['PERDA_DESPERDICIO', 'Sucata alumínio', 'KG'],
    ['PERDA_DESPERDICIO', 'Perda de perfil', 'ML'],
  ]
  for (const [tipo, desc, un] of gerais) {
    push({
      tipo_custo: tipo,
      subtipo: tipo,
      descricao: desc,
      linha: 'GERAL',
      unidade_custo: un,
      origem:
        tipo === 'SERVICO'
          ? 'INTERNO'
          : tipo === 'TERCEIRIZACAO'
            ? 'TERCEIRO'
            : tipo === 'PERDA_DESPERDICIO'
              ? 'INTERNO'
              : 'COMPRA',
      marca: tipo === 'SILICONE' ? 'SIKA' : 'GENERICA',
    })
  }

  return rows
}

function chunkInsert(table, columns, rows, conflict) {
  const size = 200
  const out = []
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size)
    const vals = slice
      .map((r) => `  (${columns.map((c) => q(r[c])).join(', ')})`)
      .join(',\n')
    out.push(
      `INSERT INTO ${table} (${columns.join(', ')})\nVALUES\n${vals}\n${conflict};`,
    )
  }
  return out.join('\n\n')
}

const produtos = buildProdutos()
const custos = buildCustos()

const prodCols = [
  'linha',
  'produto',
  'cor',
  'categoria',
  'descricao',
  'unidade_venda',
  'familia',
  'marca',
  'acabamento',
  'segmento',
  'codigo_interno',
]
const custoCols = [
  'tipo_custo',
  'descricao',
  'linha',
  'produto',
  'cor',
  'espessura',
  'tipo_vidro',
  'unidade_custo',
  'marca',
  'subtipo',
  'acabamento',
  'codigo_interno',
  'origem',
]

// Dims mínimas (upsert)
const LINHAS_DIM = ARVORE_LINHAS.map((l) => [
  l.linha,
  `Linha ${l.linha}`,
  l.tipo,
])
const CORES_DIM = [
  ...CORES_PERFIL.map((c) => [c, c, 'PERFIL']),
  ...CORES_VIDRO.map((c) => [c, c, 'VIDRO']),
  ...CORES_ACM.map((c) => [c, c, 'PERFIL']),
  ...CORES_INOX.map((c) => [c, c, 'PERFIL']),
  ['GERAL', 'Geral', 'AMBOS'],
]
const corSeen = new Set()
const CORES_DIM_U = []
for (const c of CORES_DIM) {
  if (corSeen.has(c[0])) continue
  corSeen.add(c[0])
  CORES_DIM_U.push(c)
}

const sql = `-- =============================================================================
-- RESEED hierárquico: Linha → Produto → Cor | Tipo → Linha → Item
-- Produtos: ${produtos.length} | Custos: ${custos.length}
-- =============================================================================

BEGIN;

-- Garante linha GERAL na dim (custos transversais)
INSERT INTO dt_catalogo.dim_linha (codigo, nome, tipo_sistema, descricao) VALUES
${LINHAS_DIM.map((l) => `  (${q(l[0])}, ${q(l[1])}, ${q(l[2])}, NULL)`).join(',\n')},
  ('GERAL', 'Geral / transversal', 'ALUMINIO', 'Custos sem vínculo a uma linha comercial')
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, tipo_sistema = EXCLUDED.tipo_sistema;

INSERT INTO dt_catalogo.dim_cor (codigo, nome, familia_cor, aplicavel_a) VALUES
${CORES_DIM_U.map((c) => `  (${q(c[0])}, ${q(c[1])}, 'NEUTRO', ${q(c[2])})`).join(',\n')}
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome;

-- Limpa catálogo operacional (histórico analytics.ctl_* permanece como snapshot)
TRUNCATE TABLE dt_catalogo.ctl_custos RESTART IDENTITY CASCADE;
TRUNCATE TABLE dt_catalogo.ctl_produtos RESTART IDENTITY CASCADE;

${chunkInsert(
  'dt_catalogo.ctl_produtos',
  prodCols,
  produtos,
  'ON CONFLICT (linha, produto, cor) DO NOTHING',
)}

${chunkInsert(
  'dt_catalogo.ctl_custos',
  custoCols,
  custos.map((c) => ({
    tipo_custo: c.tipo_custo,
    descricao: c.descricao,
    linha: c.linha ?? null,
    produto: c.produto ?? null,
    cor: c.cor ?? null,
    espessura: c.espessura ?? null,
    tipo_vidro: c.tipo_vidro ?? null,
    unidade_custo: c.unidade_custo,
    marca: c.marca ?? null,
    subtipo: c.subtipo ?? null,
    acabamento: c.acabamento ?? null,
    codigo_interno: c.codigo_interno,
    origem: c.origem ?? 'COMPRA',
  })),
  `ON CONFLICT (codigo_interno) WHERE codigo_interno IS NOT NULL DO NOTHING`,
)}

SELECT setval(
  pg_get_serial_sequence('dt_catalogo.ctl_produtos', 'id_produto'),
  (SELECT COALESCE(MAX(id_produto), 1) FROM dt_catalogo.ctl_produtos)
);
SELECT setval(
  pg_get_serial_sequence('dt_catalogo.ctl_custos', 'id_custo'),
  (SELECT COALESCE(MAX(id_custo), 1) FROM dt_catalogo.ctl_custos)
);

COMMIT;
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, sql, 'utf8')

const porLinha = {}
for (const p of produtos) {
  porLinha[p.linha] ??= { produtos: new Set(), cores: new Set() }
  porLinha[p.linha].produtos.add(p.produto)
  porLinha[p.linha].cores.add(p.cor)
}

console.log(`Wrote ${outPath}`)
console.log(`Produtos SKU: ${produtos.length}`)
console.log(`Custos: ${custos.length}`)
console.log('--- Hierarquia por linha ---')
for (const [linha, v] of Object.entries(porLinha).sort()) {
  console.log(
    `  ${linha}: ${v.produtos.size} produtos × ${v.cores.size} cores`,
  )
}
