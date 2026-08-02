-- =============================================================================
-- Glazia — migração-base: porte 1:1 do modelo BigQuery para PostgreSQL.
-- Mantém nomes de schema, tabela e coluna idênticos ao BigQuery.
-- Ganho: PK, FK, UNIQUE e CHECK realmente aplicados pelo banco.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS dt_catalogo;

COMMENT ON SCHEMA analytics IS 'Modelo dimensional operacional do Glazia (equivalente ao dataset whglazia.analytics).';
COMMENT ON SCHEMA dt_catalogo IS 'Catálogo compartilhado de produtos e custos (equivalente ao dataset whglazia.dt_catalogo).';

-- -----------------------------------------------------------------------------
-- Dimensões base
-- -----------------------------------------------------------------------------

CREATE TABLE analytics.dim_empresa (
  id_empresa       text PRIMARY KEY,
  nome_fantasia    text NOT NULL,
  cnpj             text,
  plano_assinatura text,
  data_onboarding  date
);
COMMENT ON TABLE analytics.dim_empresa IS 'Tenant. Raiz da segregação multiempresa.';

CREATE TABLE analytics.dim_usuario (
  id_user         text PRIMARY KEY,
  id_empresa      text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  cargo           text NOT NULL,
  nome_completo   text NOT NULL,
  email           text NOT NULL,
  data_nascimento date,
  ultimo_login    timestamptz,
  ativo           boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE analytics.dim_usuario IS 'Dimensão analítica de usuários. Nunca guarda senha.';

CREATE TABLE analytics.ctl_usuario (
  id_user         text PRIMARY KEY,
  id_empresa      text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  email           text NOT NULL,
  senha_hash      text NOT NULL,
  nome_completo   text NOT NULL,
  cargo           text NOT NULL,
  data_nascimento date,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  alterado_em     timestamptz,
  CONSTRAINT ctl_usuario_cargo_chk CHECK (cargo IN ('ADM', 'DIRETOR', 'SOCIO'))
);
COMMENT ON TABLE analytics.ctl_usuario IS 'Store operacional de autenticação. Senha sempre como hash scrypt.';
CREATE UNIQUE INDEX ctl_usuario_email_uk ON analytics.ctl_usuario (lower(email));

CREATE TABLE analytics.dim_cliente (
  id_cliente    text PRIMARY KEY,
  id_empresa    text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  nome          text NOT NULL,
  tipo_pessoa   text,
  score_credito integer,
  data_cadastro date,
  CONSTRAINT dim_cliente_tipo_pessoa_chk CHECK (tipo_pessoa IS NULL OR tipo_pessoa IN ('PF', 'PJ'))
);
CREATE INDEX dim_cliente_empresa_idx ON analytics.dim_cliente (id_empresa);

CREATE TABLE analytics.dim_fornecedor (
  id_fornecedor         text PRIMARY KEY,
  id_empresa            text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  nome_fornecedor       text NOT NULL,
  prazo_medio_pagamento integer
);
CREATE INDEX dim_fornecedor_empresa_idx ON analytics.dim_fornecedor (id_empresa);

CREATE TABLE analytics.dim_produto (
  id_produto     text PRIMARY KEY,
  id_empresa     text REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  nome_produto   text NOT NULL,
  tipo_item      text,
  linha_produto  text,
  unidade_medida text
);
COMMENT ON COLUMN analytics.dim_produto.id_empresa IS 'NULL quando o produto é global (catálogo compartilhado).';
CREATE INDEX dim_produto_empresa_idx ON analytics.dim_produto (id_empresa);
CREATE INDEX dim_produto_linha_idx ON analytics.dim_produto (linha_produto);

CREATE TABLE analytics.dim_projeto (
  id_projeto     text PRIMARY KEY,
  id_empresa     text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  id_cliente     text NOT NULL REFERENCES analytics.dim_cliente(id_cliente) ON UPDATE CASCADE,
  status_obra    text,
  data_aprovacao date,
  nome_obra      text
);
CREATE INDEX dim_projeto_empresa_idx ON analytics.dim_projeto (id_empresa);
CREATE INDEX dim_projeto_cliente_idx ON analytics.dim_projeto (id_cliente);

CREATE TABLE analytics.dim_plano_contas (
  id_conta     text PRIMARY KEY,
  id_empresa   text REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  tipo_conta   text NOT NULL,
  categoria    text,
  subcategoria text
);
COMMENT ON COLUMN analytics.dim_plano_contas.id_empresa IS 'NULL quando a conta é padrão do produto.';
CREATE INDEX dim_plano_contas_empresa_idx ON analytics.dim_plano_contas (id_empresa);
CREATE INDEX dim_plano_contas_tipo_idx ON analytics.dim_plano_contas (upper(tipo_conta));

CREATE TABLE analytics.dim_linha_produto (
  id_linha_produto text PRIMARY KEY,
  id_empresa       text REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  nome_linha       text NOT NULL,
  ativo            boolean NOT NULL DEFAULT true
);

CREATE TABLE analytics.dim_motivo_custo (
  id_motivo_custo      text PRIMARY KEY,
  id_empresa           text REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  codigo               text NOT NULL,
  nome                 text NOT NULL,
  descricao            text,
  tipo_custo_padrao    text,
  ativo                boolean NOT NULL DEFAULT true,
  id_usuario_criacao   text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  id_usuario_alteracao text,
  alterado_em          timestamptz,
  CONSTRAINT dim_motivo_custo_tipo_chk CHECK (
    tipo_custo_padrao IS NULL
    OR upper(tipo_custo_padrao) IN ('RETRABALHO', 'PERDA', 'GARANTIA')
  )
);
COMMENT ON COLUMN analytics.dim_motivo_custo.id_empresa IS 'NULL quando o motivo é padrão do produto.';
CREATE UNIQUE INDEX dim_motivo_custo_codigo_uk
  ON analytics.dim_motivo_custo (COALESCE(id_empresa, '@global'), upper(codigo));

CREATE TABLE analytics.dim_funcionario (
  id_funcionario       text PRIMARY KEY,
  id_empresa           text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  nome_completo        text NOT NULL,
  cargo_funcao         text,
  equipe               text,
  setor                text,
  data_admissao        date,
  data_desligamento    date,
  ativo                boolean NOT NULL DEFAULT true,
  id_usuario_criacao   text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  id_usuario_alteracao text,
  alterado_em          timestamptz,
  CONSTRAINT dim_funcionario_desligamento_chk CHECK (
    data_desligamento IS NULL OR data_admissao IS NULL OR data_desligamento >= data_admissao
  )
);
CREATE INDEX dim_funcionario_empresa_idx ON analytics.dim_funcionario (id_empresa);

-- -----------------------------------------------------------------------------
-- Fatos de venda (header/detail)
-- -----------------------------------------------------------------------------

CREATE TABLE analytics.fato_venda (
  id_venda              text PRIMARY KEY,
  id_empresa            text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  id_projeto            text REFERENCES analytics.dim_projeto(id_projeto) ON UPDATE CASCADE,
  id_cliente            text REFERENCES analytics.dim_cliente(id_cliente) ON UPDATE CASCADE,
  data_venda            date NOT NULL,
  status_venda          text NOT NULL DEFAULT 'FECHADA',
  valor_total_informado numeric(14,2) NOT NULL DEFAULT 0,
  observacao            text,
  origem                text,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  id_usuario_criacao    text,
  id_usuario_alteracao  text,
  alterado_em           timestamptz,
  CONSTRAINT fato_venda_status_chk CHECK (upper(status_venda) IN ('FECHADA', 'CANCELADA')),
  CONSTRAINT fato_venda_valor_chk CHECK (valor_total_informado >= 0)
);
COMMENT ON TABLE analytics.fato_venda IS 'Cabeçalho da venda. Grain = 1 venda.';
CREATE INDEX fato_venda_empresa_data_idx ON analytics.fato_venda (id_empresa, data_venda DESC);

CREATE TABLE analytics.fato_venda_item (
  id_venda_item           text PRIMARY KEY,
  id_venda                text NOT NULL REFERENCES analytics.fato_venda(id_venda) ON UPDATE CASCADE ON DELETE CASCADE,
  id_empresa              text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  id_produto              text REFERENCES analytics.dim_produto(id_produto) ON UPDATE CASCADE,
  linha_produto           text,
  quantidade              numeric(14,4) NOT NULL,
  valor_unitario          numeric(14,2) NOT NULL,
  valor_total_item        numeric(14,2) NOT NULL,
  custo_unitario_estimado numeric(14,2),
  custo_total_estimado    numeric(14,2),
  data_venda              date NOT NULL,
  id_usuario_criacao      text,
  criado_em               timestamptz NOT NULL DEFAULT now(),
  id_usuario_alteracao    text,
  alterado_em             timestamptz,
  origem                  text,
  CONSTRAINT fato_venda_item_qtd_chk CHECK (quantidade > 0),
  CONSTRAINT fato_venda_item_valores_chk CHECK (valor_unitario >= 0 AND valor_total_item >= 0)
);
COMMENT ON TABLE analytics.fato_venda_item IS 'Detalhe da venda. Grain = 1 item vendido.';
CREATE INDEX fato_venda_item_venda_idx ON analytics.fato_venda_item (id_venda);
CREATE INDEX fato_venda_item_empresa_data_idx ON analytics.fato_venda_item (id_empresa, data_venda DESC);
CREATE INDEX fato_venda_item_produto_idx ON analytics.fato_venda_item (id_produto);

-- -----------------------------------------------------------------------------
-- Fato de custos operacionais (inclui perdas, retrabalhos e garantias)
-- -----------------------------------------------------------------------------

CREATE TABLE analytics.fato_custos_operacionais (
  id_custo                   text PRIMARY KEY,
  id_empresa                 text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  id_projeto                 text REFERENCES analytics.dim_projeto(id_projeto) ON UPDATE CASCADE,
  id_produto_consumido       text REFERENCES analytics.dim_produto(id_produto) ON UPDATE CASCADE,
  id_fornecedor              text REFERENCES analytics.dim_fornecedor(id_fornecedor) ON UPDATE CASCADE,
  quantidade                 numeric(14,4),
  valor_unitario             numeric(14,2),
  valor_total_custo          numeric(14,2) NOT NULL,
  data_emissao_nf            date,
  id_usuario_criacao         text,
  criado_em                  timestamptz NOT NULL DEFAULT now(),
  id_usuario_alteracao       text,
  alterado_em                timestamptz,
  origem                     text,
  id_venda                   text REFERENCES analytics.fato_venda(id_venda) ON UPDATE CASCADE,
  id_venda_item              text REFERENCES analytics.fato_venda_item(id_venda_item) ON UPDATE CASCADE,
  linha_produto              text,
  tipo_custo                 text,
  id_motivo_custo            text REFERENCES analytics.dim_motivo_custo(id_motivo_custo) ON UPDATE CASCADE,
  etapa_ocorrencia           text,
  quantidade_perdida         numeric(14,4),
  id_funcionario_responsavel text REFERENCES analytics.dim_funcionario(id_funcionario) ON UPDATE CASCADE,
  id_custo_origem            text REFERENCES analytics.fato_custos_operacionais(id_custo) ON UPDATE CASCADE,
  observacao                 text,
  data_ocorrencia            date,
  CONSTRAINT fato_custos_valor_chk CHECK (valor_total_custo >= 0),
  CONSTRAINT fato_custos_qtd_perdida_chk CHECK (quantidade_perdida IS NULL OR quantidade_perdida >= 0),
  CONSTRAINT fato_custos_etapa_chk CHECK (
    etapa_ocorrencia IS NULL
    OR upper(etapa_ocorrencia) IN ('COMPRA', 'PRODUCAO', 'TRANSPORTE', 'INSTALACAO', 'POS_VENDA')
  )
);
COMMENT ON TABLE analytics.fato_custos_operacionais IS 'Custos de material, serviço, perdas, retrabalhos e garantias. Grain = 1 lançamento de custo.';
CREATE INDEX fato_custos_empresa_data_idx ON analytics.fato_custos_operacionais (id_empresa, data_emissao_nf DESC);
CREATE INDEX fato_custos_venda_idx ON analytics.fato_custos_operacionais (id_venda);
CREATE INDEX fato_custos_tipo_idx ON analytics.fato_custos_operacionais (upper(tipo_custo));
CREATE INDEX fato_custos_motivo_idx ON analytics.fato_custos_operacionais (id_motivo_custo);

-- -----------------------------------------------------------------------------
-- Despesas fixas + fluxo de caixa
-- -----------------------------------------------------------------------------

CREATE TABLE analytics.cad_despesa_fixa (
  id_despesa_fixa      text PRIMARY KEY,
  id_empresa           text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  id_plano_contas      text NOT NULL REFERENCES analytics.dim_plano_contas(id_conta) ON UPDATE CASCADE,
  descricao            text NOT NULL,
  valor_mensal         numeric(14,2) NOT NULL,
  dia_vencimento       integer NOT NULL,
  data_inicio          date NOT NULL,
  data_fim             date,
  ativo                boolean NOT NULL DEFAULT true,
  id_usuario_criacao   text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  id_usuario_alteracao text,
  alterado_em          timestamptz,
  observacao           text,
  CONSTRAINT cad_despesa_fixa_valor_chk CHECK (valor_mensal > 0),
  CONSTRAINT cad_despesa_fixa_dia_chk CHECK (dia_vencimento BETWEEN 1 AND 31),
  CONSTRAINT cad_despesa_fixa_vigencia_chk CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);
COMMENT ON TABLE analytics.cad_despesa_fixa IS 'Compromissos recorrentes. data_fim NULL = vigência indeterminada.';
CREATE INDEX cad_despesa_fixa_empresa_idx ON analytics.cad_despesa_fixa (id_empresa, ativo);

CREATE TABLE analytics.fato_fluxo_caixa (
  id_transacao         text PRIMARY KEY,
  id_empresa           text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  tipo_movimentacao    text NOT NULL,
  id_plano_contas      text REFERENCES analytics.dim_plano_contas(id_conta) ON UPDATE CASCADE,
  id_projeto           text REFERENCES analytics.dim_projeto(id_projeto) ON UPDATE CASCADE,
  data_vencimento      date NOT NULL,
  data_pagamento       date,
  valor_previsto       numeric(14,2) NOT NULL,
  valor_realizado      numeric(14,2),
  metodo_pagamento     text,
  status_financeiro    text NOT NULL DEFAULT 'PREVISTO',
  id_usuario_criacao   text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  id_usuario_alteracao text,
  alterado_em          timestamptz,
  origem               text,
  data_competencia     date,
  id_despesa_fixa      text REFERENCES analytics.cad_despesa_fixa(id_despesa_fixa) ON UPDATE CASCADE ON DELETE SET NULL,
  id_venda             text REFERENCES analytics.fato_venda(id_venda) ON UPDATE CASCADE,
  descricao            text,
  CONSTRAINT fato_fluxo_tipo_chk CHECK (
    upper(tipo_movimentacao) IN ('ENTRADA', 'SAIDA', 'RECEITA', 'RECEBIMENTO', 'DESPESA', 'PAGAMENTO')
  ),
  CONSTRAINT fato_fluxo_status_chk CHECK (
    upper(status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO', 'PAGO', 'RECEBIDO', 'REALIZADO', 'CANCELADO')
  ),
  CONSTRAINT fato_fluxo_valor_chk CHECK (valor_previsto >= 0)
);
COMMENT ON TABLE analytics.fato_fluxo_caixa IS 'Previsto x realizado de entradas e saídas. Grain = 1 parcela/movimentação.';
CREATE INDEX fato_fluxo_empresa_venc_idx ON analytics.fato_fluxo_caixa (id_empresa, data_vencimento);
CREATE INDEX fato_fluxo_despesa_idx ON analytics.fato_fluxo_caixa (id_despesa_fixa);
CREATE INDEX fato_fluxo_status_idx ON analytics.fato_fluxo_caixa (upper(status_financeiro));
