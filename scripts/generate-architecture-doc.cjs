const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')

const output = path.join(
  __dirname,
  '..',
  'docs',
  'Glazia-Arquitetura-Guia-Junior.pdf',
)
const logo = path.join(__dirname, '..', 'public', 'logo-full.png')

const COLORS = {
  ink: '#181512',
  muted: '#6E655C',
  bronze: '#A07850',
  bronzeLight: '#E9DDCF',
  bronzePale: '#F7F3EE',
  line: '#DDD5CC',
  white: '#FFFFFF',
  black: '#080706',
  green: '#2D7A57',
  red: '#A94F42',
  blue: '#315B73',
}

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 58, bottom: 58, left: 52, right: 52 },
  bufferPages: true,
  info: {
    Title: 'Glazia — Arquitetura e Lógica do Sistema',
    Author: 'Glazia',
    Subject: 'Guia técnico introdutório para desenvolvimento do SaaS',
    Keywords: 'Glazia, Supabase, NestJS, BigQuery, multi-tenant, CQRS',
  },
})

const stream = fs.createWriteStream(output)
doc.pipe(stream)

const contentWidth = 595.28 - 104
const bottom = 841.89 - 58

function normalPage() {
  doc.addPage()
  doc.fillColor(COLORS.ink)
}

function ensureSpace(height = 80) {
  if (doc.y + height > bottom) normalPage()
}

function title(text, subtitle) {
  ensureSpace(80)
  doc
    .font('Helvetica-Bold')
    .fontSize(23)
    .fillColor(COLORS.ink)
    .text(text, { width: contentWidth })
  if (subtitle) {
    doc
      .moveDown(0.35)
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(COLORS.muted)
      .text(subtitle, { width: contentWidth, lineGap: 2 })
  }
  doc
    .moveDown(0.8)
    .strokeColor(COLORS.bronze)
    .lineWidth(2)
    .moveTo(52, doc.y)
    .lineTo(132, doc.y)
    .stroke()
  doc.moveDown(1)
}

function h2(text) {
  ensureSpace(45)
  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor(COLORS.ink)
    .text(text, { width: contentWidth })
  doc.moveDown(0.45)
}

function h3(text) {
  ensureSpace(36)
  doc
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .fillColor(COLORS.bronze)
    .text(text, { width: contentWidth })
  doc.moveDown(0.3)
}

function paragraph(text, options = {}) {
  ensureSpace(options.keep || 45)
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size || 10.2)
    .fillColor(options.color || COLORS.ink)
    .text(text, {
      width: options.width || contentWidth,
      lineGap: options.lineGap ?? 3,
      align: options.align || 'left',
    })
  doc.moveDown(options.after ?? 0.7)
}

function bullet(text, level = 0) {
  ensureSpace(30)
  const x = 58 + level * 18
  const width = contentWidth - 12 - level * 18
  const y = doc.y
  doc
    .fillColor(level ? COLORS.muted : COLORS.bronze)
    .circle(x, y + 5, level ? 1.5 : 2.2)
    .fill()
  doc
    .font('Helvetica')
    .fontSize(9.8)
    .fillColor(COLORS.ink)
    .text(text, x + 10, y, { width, lineGap: 2.5 })
  doc.moveDown(0.45)
}

function numbered(number, heading, text) {
  ensureSpace(56)
  const y = doc.y
  doc
    .fillColor(COLORS.bronze)
    .circle(67, y + 10, 10)
    .fill()
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.white)
    .text(String(number), 57, y + 5.5, { width: 20, align: 'center' })
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(COLORS.ink)
    .text(heading, 85, y, { width: contentWidth - 33 })
  doc
    .moveDown(0.2)
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(COLORS.muted)
    .text(text, 85, doc.y, {
      width: contentWidth - 33,
      lineGap: 2.5,
    })
  doc.moveDown(0.65)
}

function callout(heading, text, color = COLORS.bronze) {
  ensureSpace(76)
  const y = doc.y
  const height =
    doc.heightOfString(text, {
      width: contentWidth - 38,
      lineGap: 2.5,
      font: 'Helvetica',
      fontSize: 9.5,
    }) + 42
  doc
    .roundedRect(52, y, contentWidth, height, 6)
    .fillAndStroke(COLORS.bronzePale, COLORS.line)
  doc.rect(52, y, 4, height).fill(color)
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.ink)
    .text(heading, 68, y + 12, { width: contentWidth - 28 })
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(COLORS.muted)
    .text(text, 68, y + 28, {
      width: contentWidth - 30,
      lineGap: 2.5,
    })
  doc.y = y + height + 12
}

function code(lines) {
  ensureSpace(48 + lines.length * 13)
  const y = doc.y
  const height = 24 + lines.length * 13
  doc.roundedRect(52, y, contentWidth, height, 5).fill('#211E1B')
  doc
    .font('Courier')
    .fontSize(8.5)
    .fillColor('#F0E8DF')
    .text(lines.join('\n'), 66, y + 12, {
      width: contentWidth - 28,
      lineGap: 3,
    })
  doc.y = y + height + 12
}

function box(x, y, width, height, heading, body, accent = COLORS.bronze) {
  doc.roundedRect(x, y, width, height, 6).fillAndStroke('#FFFFFF', COLORS.line)
  doc.rect(x, y, width, 4).fill(accent)
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.ink)
    .text(heading, x + 10, y + 13, { width: width - 20 })
  doc
    .font('Helvetica')
    .fontSize(8.3)
    .fillColor(COLORS.muted)
    .text(body, x + 10, y + 31, {
      width: width - 20,
      lineGap: 2,
    })
}

function arrow(x1, y1, x2, y2, label) {
  doc
    .strokeColor(COLORS.bronze)
    .lineWidth(1.2)
    .moveTo(x1, y1)
    .lineTo(x2, y2)
    .stroke()
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const size = 5
  doc
    .moveTo(x2, y2)
    .lineTo(
      x2 - size * Math.cos(angle - Math.PI / 6),
      y2 - size * Math.sin(angle - Math.PI / 6),
    )
    .lineTo(
      x2 - size * Math.cos(angle + Math.PI / 6),
      y2 - size * Math.sin(angle + Math.PI / 6),
    )
    .closePath()
    .fill(COLORS.bronze)
  if (label) {
    doc
      .font('Helvetica')
      .fontSize(7.2)
      .fillColor(COLORS.muted)
      .text(label, (x1 + x2) / 2 - 40, (y1 + y2) / 2 - 13, {
        width: 80,
        align: 'center',
      })
  }
}

function simpleTable(headers, rows, widths) {
  const rowHeight = 32
  ensureSpace(rowHeight * Math.min(rows.length + 1, 7) + 20)
  let y = doc.y
  let x = 52

  headers.forEach((header, index) => {
    doc.rect(x, y, widths[index], rowHeight).fill(COLORS.ink)
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(COLORS.white)
      .text(header, x + 7, y + 10, {
        width: widths[index] - 14,
      })
    x += widths[index]
  })
  y += rowHeight

  rows.forEach((row, rowIndex) => {
    if (y + rowHeight > bottom) {
      normalPage()
      y = doc.y
    }
    x = 52
    row.forEach((cell, index) => {
      doc
        .rect(x, y, widths[index], rowHeight)
        .fillAndStroke(
          rowIndex % 2 === 0 ? COLORS.white : COLORS.bronzePale,
          COLORS.line,
        )
      doc
        .font('Helvetica')
        .fontSize(8.2)
        .fillColor(COLORS.ink)
        .text(String(cell), x + 7, y + 7, {
          width: widths[index] - 14,
          height: rowHeight - 10,
          ellipsis: true,
        })
      x += widths[index]
    })
    y += rowHeight
  })
  doc.y = y + 12
}

// Capa
doc.rect(0, 0, 595.28, 841.89).fill(COLORS.black)
if (fs.existsSync(logo)) {
  doc.image(logo, 92, 105, { fit: [410, 135], align: 'center' })
}
doc
  .font('Helvetica-Bold')
  .fontSize(31)
  .fillColor(COLORS.white)
  .text('ARQUITETURA DO SISTEMA', 62, 315, {
    width: 471,
    align: 'center',
  })
doc
  .font('Helvetica')
  .fontSize(15)
  .fillColor('#D1B48C')
  .text('Guia técnico para quem está começando', 62, 366, {
    width: 471,
    align: 'center',
  })
doc
  .strokeColor(COLORS.bronze)
  .lineWidth(2)
  .moveTo(220, 410)
  .lineTo(375, 410)
  .stroke()
doc
  .font('Helvetica')
  .fontSize(10.5)
  .fillColor('#C8C0B8')
  .text(
    'Frontend React · API NestJS/Fastify · Supabase PostgreSQL · BigQuery',
    90,
    445,
    { width: 415, align: 'center', lineGap: 5 },
  )
doc
  .font('Helvetica')
  .fontSize(9)
  .fillColor('#8D857D')
  .text('Versão 1.0 · Julho de 2026', 62, 755, {
    width: 471,
    align: 'center',
  })

// Visão geral
normalPage()
title(
  '1. O que estamos construindo?',
  'Uma visão simples antes de entrar nos detalhes técnicos.',
)
paragraph(
  'O Glazia é um SaaS de controle financeiro para vidraçarias e empresas de esquadrias. “SaaS” significa que várias empresas usam o mesmo produto pela internet, mas cada uma enxerga somente os próprios dados.',
)
callout(
  'A regra mais importante do sistema',
  'Nenhuma empresa pode visualizar, alterar ou inferir dados de outra. Chamamos isso de isolamento multi-tenant. O campo id_empresa acompanha todos os dados de negócio e a segurança é aplicada em mais de uma camada.',
  COLORS.red,
)
h2('O sistema possui quatro grandes partes')
const startY = doc.y
box(52, startY, 112, 102, 'Frontend', 'Telas usadas pelo cliente. React, Vite e TypeScript.', COLORS.bronze)
box(177, startY, 112, 102, 'API', 'Guarda-costas que valida o usuário e executa regras.', COLORS.blue)
box(302, startY, 112, 102, 'Supabase', 'Login e dados operacionais do dia a dia.', COLORS.green)
box(427, startY, 116, 102, 'BigQuery', 'Relatórios, histórico e análises pesadas.', COLORS.bronze)
doc.y = startY + 120
paragraph(
  'O frontend nunca acessa o BigQuery diretamente. Para operações reais, ele conversa com a API. A API valida o JWT, descobre a empresa do usuário e consulta o Supabase usando a identidade desse usuário.',
)
h2('Estado atual da implementação')
bullet('Frontend visual do Glazia em React, responsivo e com modo claro/escuro.')
bullet('API NestJS executando com o adaptador Fastify.')
bullet('Login integrado ao Supabase Auth.')
bullet('CRUD inicial de lançamentos financeiros conectado à API.')
bullet('RLS, índices e validações multi-tenant aplicados no Supabase.')
bullet('BigQuery modelado, mas a sincronização ETL ainda é a próxima fase.')

// Glossário
normalPage()
title('2. Glossário essencial', 'Os termos que aparecem com frequência no projeto.')
simpleTable(
  ['Termo', 'Significado simples'],
  [
    ['Frontend', 'A parte visual que roda no navegador do usuário.'],
    ['Backend / API', 'O servidor que valida pedidos, aplica regras e acessa dados.'],
    ['JWT', 'Um token assinado que comprova quem fez login.'],
    ['Tenant', 'Uma empresa cliente dentro do SaaS.'],
    ['Multi-tenant', 'Várias empresas usam a mesma aplicação com dados isolados.'],
    ['RLS', 'Regras do PostgreSQL que filtram linhas conforme o usuário.'],
    ['OLTP', 'Banco voltado para inserts, updates e operação diária.'],
    ['OLAP', 'Banco voltado para grandes análises e agregações.'],
    ['CQRS', 'Separação entre o caminho operacional e o analítico.'],
    ['ETL / ELT', 'Processo de copiar e transformar dados entre bancos.'],
    ['Schema estrela', 'Modelo analítico com fatos no centro e dimensões ao redor.'],
    ['Idempotência', 'Executar novamente sem duplicar ou corromper dados.'],
  ],
  [112, 379],
)
callout(
  'Uma analogia útil',
  'Pense no Supabase como o caixa e o estoque da loja: registra cada operação imediatamente. O BigQuery é a sala de análise: recebe cópias organizadas para responder perguntas históricas e estratégicas.',
)

// Fluxo autenticação
normalPage()
title(
  '3. Como o login protege cada empresa',
  'O caminho completo desde a senha até uma consulta financeira.',
)
numbered(1, 'Login no Supabase Auth', 'O frontend envia e-mail e senha ao Supabase. A senha não passa pela API do Glazia.')
numbered(2, 'Supabase devolve o JWT', 'O token representa a sessão autenticada. Ele possui validade e assinatura verificável.')
numbered(3, 'Frontend chama a API', 'Cada chamada envia Authorization: Bearer <token>.')
numbered(4, 'AuthGuard valida a sessão', 'A API pede ao Supabase a confirmação de que o token ainda representa um usuário válido.')
numbered(5, 'API resolve a empresa', 'O usuário é localizado em perfis pelo auth.uid(). O id_empresa não é aceito do navegador.')
numbered(6, 'Cliente Supabase recebe o JWT', 'As consultas da API são executadas com o token do usuário, mantendo o RLS ativo.')
numbered(7, 'Filtro explícito é aplicado', 'Além do RLS, cada query de negócio inclui o id_empresa do contexto seguro.')
callout(
  'Por que duas camadas?',
  'A API filtra para evitar erros de programação. O RLS filtra novamente dentro do banco. Se uma camada falhar, a outra continua protegendo os dados. Isso é defesa em profundidade.',
  COLORS.green,
)
h2('Exemplo conceitual')
code([
  'JWT -> AuthGuard -> perfil do usuário -> empresaId seguro',
  '',
  'SELECT * FROM lancamentos_financeiros',
  'WHERE id_empresa = empresaIdSeguro;',
])
paragraph(
  'O frontend nunca decide qual empresa consultar. Um campo id_empresa enviado pelo navegador é ignorado e rejeitado pela validação dos DTOs.',
  { color: COLORS.muted },
)

// Diagrama request
normalPage()
title('4. Fluxo de uma requisição', 'Exemplo: registrar uma entrada financeira.')
const flowY = doc.y + 8
box(58, flowY, 105, 76, '1. Navegador', 'POST /lancamentos\n+ JWT', COLORS.bronze)
box(202, flowY, 105, 76, '2. AuthGuard', 'Valida token e encontra empresa.', COLORS.blue)
box(346, flowY, 105, 76, '3. Serviço', 'Monta payload sem confiar no tenant.', COLORS.green)
arrow(163, flowY + 38, 202, flowY + 38, 'Bearer JWT')
arrow(307, flowY + 38, 346, flowY + 38, 'Contexto')
const flowY2 = flowY + 135
box(130, flowY2, 125, 82, '4. PostgreSQL', 'RLS e triggers validam empresa e referências.', COLORS.green)
box(340, flowY2, 125, 82, '5. Resposta', 'Lançamento normalizado volta ao React.', COLORS.bronze)
arrow(400, flowY + 76, 255, flowY2 + 20, 'INSERT seguro')
arrow(255, flowY2 + 62, 340, flowY2 + 62, 'Registro')
doc.y = flowY2 + 110
h2('O que acontece se houver fraude ou erro?')
bullet('JWT ausente ou inválido: a API responde HTTP 401.')
bullet('Usuário sem perfil/empresa: a API responde HTTP 401.')
bullet('ID de cliente de outra empresa: trigger do banco bloqueia a operação.')
bullet('Campo não permitido no body: ValidationPipe rejeita a requisição.')
bullet('Registro inexistente: a API responde HTTP 404 quando aplicável.')

// Supabase schema
normalPage()
title(
  '5. Banco operacional: Supabase/PostgreSQL',
  'Fonte da verdade para a operação diária.',
)
paragraph(
  'O PostgreSQL guarda dados que mudam constantemente: usuários, clientes, fornecedores, projetos, produtos, lançamentos e despesas fixas. Essas tabelas são o OLTP do Glazia.',
)
simpleTable(
  ['Tabela', 'Responsabilidade', 'Ligação principal'],
  [
    ['empresas', 'Representa cada tenant.', 'Raiz do isolamento.'],
    ['perfis', 'Liga auth.users à empresa.', 'id = auth.uid().'],
    ['clientes', 'Clientes da vidraçaria.', 'Pertence à empresa.'],
    ['fornecedores', 'Fornecedores de materiais.', 'Pertence à empresa.'],
    ['produtos', 'Produtos finais e insumos.', 'Empresa ou catálogo global.'],
    ['projetos', 'Obras vinculadas a clientes.', 'Empresa + cliente.'],
    ['plano_contas', 'Classificação financeira.', 'Empresa ou catálogo global.'],
    ['lancamentos_financeiros', 'Entradas, saídas e previsões.', 'Relaciona os cadastros.'],
    ['despesas_fixas', 'Compromissos recorrentes.', 'Empresa + plano de contas.'],
  ],
  [120, 237, 134],
)

// Relacionamentos
normalPage()
title('6. Relações entre as tabelas', 'Como ler o modelo relacional.')
const relY = doc.y
box(225, relY, 145, 58, 'empresas', 'id é o tenant central.', COLORS.bronze)
box(52, relY + 100, 125, 62, 'clientes', 'id_empresa -> empresas', COLORS.blue)
box(235, relY + 100, 125, 62, 'projetos', 'empresa + cliente', COLORS.green)
box(418, relY + 100, 125, 62, 'produtos', 'empresa ou global', COLORS.blue)
box(52, relY + 220, 145, 70, 'fornecedores', 'materiais e compras', COLORS.blue)
box(225, relY + 220, 145, 70, 'lançamentos', 'fato operacional central', COLORS.bronze)
box(398, relY + 220, 145, 70, 'plano_contas', 'categoria financeira', COLORS.blue)
arrow(250, relY + 58, 115, relY + 100)
arrow(298, relY + 58, 298, relY + 100)
arrow(345, relY + 58, 480, relY + 100)
arrow(177, relY + 131, 235, relY + 131, 'cliente')
arrow(115, relY + 162, 250, relY + 220)
arrow(298, relY + 162, 298, relY + 220)
arrow(480, relY + 162, 345, relY + 220)
arrow(398, relY + 255, 370, relY + 255)
doc.y = relY + 320
callout(
  'Integridade entre tenants',
  'Uma foreign key comum confirma que um ID existe, mas não garante que ele pertence à mesma empresa. Por isso o Glazia possui triggers privados que validam a combinação entre o registro referenciado e id_empresa.',
  COLORS.red,
)
h3('Exemplo bloqueado')
paragraph(
  'A Empresa B tenta criar um projeto usando um cliente da Empresa A. O cliente existe, mas a trigger validar_projeto_tenant detecta a divergência e cancela o INSERT.',
)

// RLS
normalPage()
title('7. Como o RLS funciona', 'Segurança aplicada dentro do PostgreSQL.')
paragraph(
  'RLS significa Row-Level Security, ou segurança por linha. Ao consultar uma tabela, o PostgreSQL avalia políticas antes de devolver cada registro.',
)
h2('Função de contexto')
code([
  'private.empresa_logada()',
  '  -> lê auth.uid()',
  '  -> procura o usuário em public.perfis',
  '  -> devolve o id_empresa vinculado',
])
paragraph(
  'A função fica no schema private, possui search_path fixo e não pode ser chamada anonimamente. Ela é SECURITY DEFINER porque precisa encontrar o perfil sem entrar em recursão com a própria política de perfis.',
)
h2('Tipos de política')
bullet('SELECT: permite visualizar somente registros da empresa autenticada.')
bullet('INSERT: exige que o novo registro use a empresa autenticada.')
bullet('UPDATE: valida tanto o registro atual quanto o resultado atualizado.')
bullet('DELETE: permite remover apenas registros pertencentes ao tenant.')
bullet('Produtos e planos globais: podem ser lidos, mas não alterados por empresas.')
callout(
  'Atenção com service_role',
  'A chave service_role ignora RLS. Ela existe apenas para tarefas administrativas controladas, como o bootstrap do primeiro tenant. Nunca deve chegar ao React, ao navegador, a logs ou ao repositório Git.',
  COLORS.red,
)

// API
normalPage()
title('8. API NestJS + Fastify', 'A fronteira segura entre o navegador e os dados.')
paragraph(
  'NestJS organiza o backend em módulos, controllers, services, guards e DTOs. Fastify é o servidor HTTP usado por baixo, escolhido por ser rápido e leve.',
)
simpleTable(
  ['Rota', 'Uso', 'Proteção'],
  [
    ['GET /api/v1/health', 'Verifica se a API está no ar.', 'Pública'],
    ['GET /api/v1/me', 'Usuário e empresa autenticada.', 'JWT'],
    ['GET /api/v1/catalogos', 'Clientes, produtos, projetos e contas.', 'JWT + tenant'],
    ['GET /api/v1/lancamentos', 'Lista lançamentos da empresa.', 'JWT + tenant'],
    ['POST /api/v1/lancamentos', 'Cria entrada ou saída.', 'JWT + DTO + RLS'],
    ['DELETE /api/v1/lancamentos/:id', 'Exclui lançamento da empresa.', 'JWT + tenant'],
  ],
  [165, 190, 136],
)
h2('Responsabilidade de cada peça')
bullet('Controller: recebe HTTP e encaminha para o service.')
bullet('DTO: valida formato, tipos e campos permitidos.')
bullet('AuthGuard: valida JWT e monta o contexto seguro.')
bullet('Service: executa a regra de negócio e as queries.')
bullet('SupabaseService: cria clientes Supabase com a identidade correta.')
bullet('ConfigModule: impede a API de iniciar com variáveis inválidas.')
h2('Regra de implementação')
callout(
  'Nunca aceite id_empresa do cliente',
  'O DTO não possui id_empresa. O service recebe empresaId separadamente, vindo do AuthGuard. Essa separação torna difícil misturar dados por acidente.',
)

// Frontend
normalPage()
title('9. Integração com o frontend', 'Como o protótipo passou a usar dados reais.')
h2('Antes')
bullet('Login aceitava qualquer senha.')
bullet('Lançamentos vinham de arrays em seed.ts.')
bullet('Alterações eram salvas no localStorage.')
h2('Agora')
bullet('Login usa signInWithPassword do Supabase Auth.')
bullet('A sessão é persistida e renovada pelo cliente Supabase.')
bullet('A camada src/services/api.ts envia o JWT para a API.')
bullet('O AppContext carrega usuário, catálogos e lançamentos reais.')
bullet('O formulário cria clientes por nome quando necessário.')
bullet('Despesas e dashboards ainda permanecem parcialmente simulados nesta fase.')
callout(
  'Por que integrar por etapas?',
  'Trocar tudo de uma vez aumenta o risco. A fatia vertical de login + lançamentos prova autenticação, API, RLS e frontend. Depois repetimos o padrão para despesas, projetos e dashboards.',
  COLORS.green,
)
h2('Arquivos principais')
code([
  'src/services/supabase.ts        -> sessão e cliente Supabase',
  'src/services/api.ts             -> chamadas HTTP autenticadas',
  'src/context/AppContext.tsx      -> estado e integração das telas',
  'src/pages/Login.tsx             -> login real',
  'src/pages/Lancamentos.tsx       -> CRUD conectado',
])

// BigQuery
normalPage()
title('10. Banco analítico: BigQuery', 'Onde ficam relatórios e análises históricas.')
paragraph(
  'O BigQuery não substitui o PostgreSQL. Ele recebe cópias transformadas dos dados para responder consultas grandes com eficiência. O dataset analytics usa um esquema estrela.',
)
h2('Dimensões: quem, o quê e onde')
bullet('dim_empresa: identifica a empresa.')
bullet('dim_cliente: descreve o cliente.')
bullet('dim_produto: produto, linha e unidade.')
bullet('dim_projeto: obra, cliente e status.')
bullet('dim_plano_contas: categoria e subcategoria.')
bullet('dim_fornecedor: fornecedor e prazo médio.')
h2('Fatos: eventos mensuráveis')
bullet('fato_vendas: valor vendido e custo estimado por projeto/produto.')
bullet('fato_custos_operacionais: materiais, quantidades e fornecedores.')
bullet('fato_fluxo_caixa: previsto, realizado, vencimento e pagamento.')
callout(
  'Performance e custo',
  'As fatos devem ser particionadas pela coluna de data e clusterizadas por id_empresa. A API analítica também deve exigir filtro de tenant e, quando possível, filtro de partição.',
)

// CQRS ETL
normalPage()
title('11. CQRS e sincronização', 'Como Supabase e BigQuery trabalham juntos.')
const cqY = doc.y + 5
box(52, cqY, 125, 72, 'Operação', 'Usuário cria ou altera dados.', COLORS.bronze)
box(235, cqY, 125, 72, 'Supabase OLTP', 'Fonte da verdade transacional.', COLORS.green)
box(418, cqY, 125, 72, 'Outbox / CDC', 'Registra mudanças para sincronizar.', COLORS.blue)
arrow(177, cqY + 36, 235, cqY + 36)
arrow(360, cqY + 36, 418, cqY + 36)
const cqY2 = cqY + 135
box(130, cqY2, 145, 75, 'ETL / ELT', 'Transforma parcelas, datas e dimensões.', COLORS.blue)
box(340, cqY2, 145, 75, 'BigQuery OLAP', 'Dashboards e projeções.', COLORS.bronze)
arrow(480, cqY + 72, 275, cqY2 + 20)
arrow(275, cqY2 + 52, 340, cqY2 + 52)
doc.y = cqY2 + 105
h2('Consistência eventual')
paragraph(
  'Um lançamento aparece imediatamente no Supabase, mas pode levar segundos ou minutos para chegar ao BigQuery. Isso é esperado. Telas operacionais devem ler do Supabase; dashboards históricos podem ler do BigQuery.',
)
h2('Requisitos do pipeline')
bullet('Idempotência: reprocessar sem duplicar.')
bullet('Checkpoint: saber até onde os dados foram processados.')
bullet('Auditoria: registrar falhas e quantidades carregadas.')
bullet('Dead letter: separar eventos problemáticos para análise.')
bullet('Observabilidade: métricas, logs e alertas de atraso.')

// Execução
normalPage()
title('12. Como executar localmente', 'Passos para desenvolvimento no Windows.')
h2('1. Configurar o frontend')
code([
  'copie .env.example para .env.local',
  'preencha VITE_SUPABASE_PUBLISHABLE_KEY',
])
h2('2. Configurar a API')
code([
  'copie server/.env.example para server/.env',
  'preencha SUPABASE_PUBLISHABLE_KEY',
])
h2('3. Criar a primeira empresa e usuário')
paragraph(
  'O bootstrap é uma operação administrativa. Coloque temporariamente a SUPABASE_SERVICE_ROLE_KEY somente em server/.env, defina e-mail, senha e nome da empresa e execute:',
)
code(['cd server', 'npm run bootstrap:tenant'])
paragraph(
  'Depois do bootstrap, remova a service_role do ambiente local se ela não for mais necessária.',
  { color: COLORS.red, bold: true },
)
h2('4. Iniciar tudo')
code(['npm run dev:full'])
paragraph('Frontend: http://localhost:5173')
paragraph('Saúde da API: http://localhost:3000/api/v1/health')

// Segurança checklist
normalPage()
title('13. Checklist de segurança', 'Use esta lista em toda funcionalidade nova.')
const securityItems = [
  'A rota exige JWT, exceto se for explicitamente pública?',
  'O id_empresa vem do contexto autenticado?',
  'O DTO rejeita id_empresa enviado pelo navegador?',
  'Toda query de negócio possui filtro explícito de tenant?',
  'O RLS cobre SELECT, INSERT, UPDATE e DELETE?',
  'Referências a cliente/projeto/produto pertencem ao tenant?',
  'A service_role está apenas no backend administrativo?',
  'Logs evitam JWT, senhas, chaves e dados financeiros sensíveis?',
  'Testes usam ao menos duas empresas?',
  'Exports, cache, IA e BigQuery também carregam id_empresa?',
]
securityItems.forEach((item, index) => {
  ensureSpace(38)
  const y = doc.y
  doc.rect(56, y + 1, 12, 12).stroke(COLORS.bronze)
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLORS.ink)
    .text(`${index + 1}. ${item}`, 80, y, {
      width: contentWidth - 28,
      lineGap: 2,
    })
  doc.moveDown(0.65)
})
callout(
  'Princípio central',
  'Segurança multi-tenant não é apenas um WHERE. Ela precisa existir no contexto da API, nas políticas RLS, na integridade relacional, nos testes e também na camada analítica.',
  COLORS.red,
)

// Roadmap
normalPage()
title('14. Próximos passos recomendados', 'Ordem segura para continuar a evolução.')
numbered(1, 'Bootstrap do primeiro tenant', 'Criar usuário, empresa e catálogos iniciais com o script administrativo.')
numbered(2, 'Despesas fixas reais', 'Criar módulo da API e substituir o localStorage da tela correspondente.')
numbered(3, 'Cadastros completos', 'CRUD de clientes, fornecedores, produtos e projetos.')
numbered(4, 'Dashboard operacional', 'Indicadores recentes calculados no PostgreSQL enquanto o ETL não está pronto.')
numbered(5, 'Outbox e sincronização', 'Implementar pipeline confiável do Supabase para o BigQuery.')
numbered(6, 'Dashboard analítico', 'Migrar agregações históricas para consultas parametrizadas no BigQuery.')
numbered(7, 'Glazia IA', 'Responder com dados reais, sempre usando o contexto seguro de tenant.')
numbered(8, 'Observabilidade', 'Adicionar logs estruturados, métricas, rastreamento e alertas.')
h2('Definição de pronto para cada módulo')
bullet('Código compilando e lint sem erros.')
bullet('Testes de sucesso, erro e isolamento entre duas empresas.')
bullet('RLS e advisors verificados após alterações no banco.')
bullet('Nenhuma credencial inserida no Git ou enviada ao navegador.')
bullet('Contrato da API documentado e consumido pelo frontend.')

// Mapa de arquivos
normalPage()
title('15. Mapa do repositório', 'Onde procurar quando precisar alterar algo.')
simpleTable(
  ['Caminho', 'O que contém'],
  [
    ['src/pages', 'Telas React do produto.'],
    ['src/components', 'Layout, loading e chat flutuante.'],
    ['src/context', 'Sessão e estado compartilhado.'],
    ['src/services', 'Cliente Supabase e chamadas da API.'],
    ['server/src/auth', 'Guard, contexto e decorators de autenticação.'],
    ['server/src/catalogos', 'Leitura dos cadastros auxiliares.'],
    ['server/src/lancamentos', 'DTO, controller, service e testes.'],
    ['server/src/supabase', 'Criação dos clientes Supabase.'],
    ['server/scripts', 'Bootstrap administrativo do primeiro tenant.'],
    ['supabase/migrations', 'Histórico versionado do banco e RLS.'],
    ['docs', 'Documentação gerada do projeto.'],
  ],
  [190, 301],
)
h2('Como raciocinar ao receber uma tarefa')
numbered(1, 'Identifique o domínio', 'É login, lançamento, projeto, análise ou sincronização?')
numbered(2, 'Defina a fonte', 'Operação diária lê Supabase; histórico pesado lê BigQuery.')
numbered(3, 'Aplique o tenant', 'Resolva id_empresa pelo JWT e filtre todas as camadas.')
numbered(4, 'Implemente verticalmente', 'Banco, API, frontend e teste do menor fluxo completo.')
numbered(5, 'Teste a fronteira', 'Tente acessar dados com um segundo tenant e confirme o bloqueio.')

// Encerramento
normalPage()
doc
  .font('Helvetica-Bold')
  .fontSize(24)
  .fillColor(COLORS.ink)
  .text('Resumo final', 52, 95, { width: contentWidth })
doc
  .moveDown(0.8)
  .font('Helvetica')
  .fontSize(12)
  .fillColor(COLORS.muted)
  .text(
    'O Glazia separa operação, segurança e análise para crescer sem misturar os dados de seus clientes.',
    { width: contentWidth, lineGap: 4 },
  )
doc.moveDown(1.4)
callout(
  'Supabase',
  'Autenticação e fonte transacional. Recebe as operações do dia a dia e aplica RLS.',
  COLORS.green,
)
callout(
  'API NestJS',
  'Valida o JWT, resolve a empresa e centraliza as regras de negócio.',
  COLORS.blue,
)
callout(
  'BigQuery',
  'Recebe dados transformados para relatórios, projeções e análises históricas.',
  COLORS.bronze,
)
callout(
  'Frontend React',
  'Apresenta a experiência do usuário e nunca decide sozinho qual empresa consultar.',
  COLORS.bronze,
)
paragraph(
  'Se você lembrar de uma única regra, lembre desta: toda funcionalidade deve ser projetada como se já existissem muitas empresas, mesmo quando o sistema ainda possui apenas um cliente.',
  { bold: true, size: 11, after: 1 },
)

console.log(`Páginas geradas: ${doc.bufferedPageRange().count}`)
doc.end()

stream.on('finish', () => {
  console.log(output)
})
