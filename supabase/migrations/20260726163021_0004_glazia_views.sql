-- Views analíticas documentadas. Mesmas colunas e mesmo grain do BigQuery.

-- -----------------------------------------------------------------------------
-- Itens de venda enriquecidos. Grain = 1 item.
-- -----------------------------------------------------------------------------
CREATE VIEW analytics.vw_venda_itens AS
SELECT
  i.id_venda_item,
  i.id_venda,
  i.id_empresa,
  v.id_cliente,
  v.id_projeto,
  v.data_venda,
  v.status_venda,
  i.id_produto,
  p.nome_produto,
  p.tipo_item,
  i.linha_produto,
  i.quantidade,
  i.valor_unitario,
  i.valor_total_item,
  i.custo_unitario_estimado,
  i.custo_total_estimado,
  i.valor_total_item - COALESCE(i.custo_total_estimado, 0) AS margem_item,
  e.nome_fantasia AS empresa,
  c.nome AS cliente,
  pr.nome_obra AS projeto
FROM analytics.fato_venda_item i
INNER JOIN analytics.fato_venda v
  ON v.id_venda = i.id_venda
 AND v.id_empresa = i.id_empresa
LEFT JOIN analytics.dim_produto p
  ON p.id_produto = i.id_produto
LEFT JOIN analytics.dim_empresa e
  ON e.id_empresa = i.id_empresa
LEFT JOIN analytics.dim_cliente c
  ON c.id_cliente = v.id_cliente
LEFT JOIN analytics.dim_projeto pr
  ON pr.id_projeto = v.id_projeto;

COMMENT ON VIEW analytics.vw_venda_itens IS 'Itens de venda enriquecidos para análise de quantidade, faturamento e margem por produto e linha.';
COMMENT ON COLUMN analytics.vw_venda_itens.id_venda_item IS 'PK do item da venda.';
COMMENT ON COLUMN analytics.vw_venda_itens.id_venda IS 'Venda/cabeçalho ao qual o item pertence.';
COMMENT ON COLUMN analytics.vw_venda_itens.id_empresa IS 'Empresa/tenant da venda.';
COMMENT ON COLUMN analytics.vw_venda_itens.id_cliente IS 'Cliente da venda.';
COMMENT ON COLUMN analytics.vw_venda_itens.id_projeto IS 'Obra/projeto relacionado à venda.';
COMMENT ON COLUMN analytics.vw_venda_itens.data_venda IS 'Data de competência da venda.';
COMMENT ON COLUMN analytics.vw_venda_itens.status_venda IS 'Status da venda. Ex.: FECHADA ou CANCELADA.';
COMMENT ON COLUMN analytics.vw_venda_itens.id_produto IS 'Produto vendido. Ex.: ctl_12.';
COMMENT ON COLUMN analytics.vw_venda_itens.nome_produto IS 'Nome legível do produto.';
COMMENT ON COLUMN analytics.vw_venda_itens.tipo_item IS 'Tipo do catálogo.';
COMMENT ON COLUMN analytics.vw_venda_itens.linha_produto IS 'Linha comercial registrada no item. Ex.: GOLD.';
COMMENT ON COLUMN analytics.vw_venda_itens.quantidade IS 'Quantidade física vendida neste item.';
COMMENT ON COLUMN analytics.vw_venda_itens.valor_unitario IS 'Preço de venda por unidade.';
COMMENT ON COLUMN analytics.vw_venda_itens.valor_total_item IS 'Faturamento do item da venda.';
COMMENT ON COLUMN analytics.vw_venda_itens.custo_unitario_estimado IS 'Custo unitário estimado no momento da venda.';
COMMENT ON COLUMN analytics.vw_venda_itens.custo_total_estimado IS 'Custo total estimado do item.';
COMMENT ON COLUMN analytics.vw_venda_itens.margem_item IS 'Margem estimada: faturamento do item menos custo estimado.';
COMMENT ON COLUMN analytics.vw_venda_itens.empresa IS 'Nome fantasia da empresa/tenant.';
COMMENT ON COLUMN analytics.vw_venda_itens.cliente IS 'Nome do cliente.';
COMMENT ON COLUMN analytics.vw_venda_itens.projeto IS 'Nome da obra/projeto.';

-- -----------------------------------------------------------------------------
-- Perdas, retrabalhos e garantias. Grain = 1 ocorrência.
-- -----------------------------------------------------------------------------
CREATE VIEW analytics.vw_perdas_retrabalhos AS
SELECT
  c.id_custo,
  c.id_empresa,
  c.id_venda,
  c.id_venda_item,
  c.id_custo_origem,
  c.id_projeto,
  c.id_produto_consumido AS id_produto,
  p.nome_produto,
  c.linha_produto,
  c.tipo_custo,
  c.id_motivo_custo,
  m.codigo AS codigo_motivo,
  m.nome AS motivo,
  c.etapa_ocorrencia,
  c.quantidade AS quantidade_comprada,
  c.quantidade_perdida,
  c.valor_unitario,
  c.valor_total_custo AS custo_perda_retrabalho,
  c.data_emissao_nf,
  COALESCE(c.data_ocorrencia, c.data_emissao_nf) AS data_ocorrencia,
  c.id_fornecedor,
  f.nome_fornecedor,
  c.id_funcionario_responsavel,
  fun.nome_completo AS funcionario_responsavel,
  fun.equipe,
  fun.setor,
  c.id_usuario_criacao,
  u.nome_completo AS usuario_lancamento,
  c.criado_em,
  c.origem,
  c.observacao
FROM analytics.fato_custos_operacionais c
LEFT JOIN analytics.dim_motivo_custo m
  ON m.id_motivo_custo = c.id_motivo_custo
 AND (m.id_empresa = c.id_empresa OR m.id_empresa IS NULL)
LEFT JOIN analytics.dim_funcionario fun
  ON fun.id_funcionario = c.id_funcionario_responsavel
 AND fun.id_empresa = c.id_empresa
LEFT JOIN analytics.dim_produto p
  ON p.id_produto = c.id_produto_consumido
LEFT JOIN analytics.dim_fornecedor f
  ON f.id_fornecedor = c.id_fornecedor
 AND f.id_empresa = c.id_empresa
LEFT JOIN analytics.dim_usuario u
  ON u.id_user = c.id_usuario_criacao
 AND u.id_empresa = c.id_empresa
WHERE upper(COALESCE(c.tipo_custo, 'NORMAL')) IN ('RETRABALHO', 'PERDA', 'GARANTIA');

COMMENT ON VIEW analytics.vw_perdas_retrabalhos IS 'Ocorrências de perdas, retrabalhos e garantias enriquecidas para análise de causa, etapa, produto, equipe e impacto financeiro.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.id_custo IS 'PK do custo que representa a ocorrência.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.id_custo_origem IS 'Custo original que motivou o retrabalho.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.tipo_custo IS 'Classificação: RETRABALHO, PERDA ou GARANTIA.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.codigo_motivo IS 'Código estável do motivo. Ex.: QUEBRA.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.motivo IS 'Nome legível do motivo. Ex.: Quebra durante instalação.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.etapa_ocorrencia IS 'Etapa do processo. Ex.: INSTALACAO.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.quantidade_comprada IS 'Quantidade lançada no custo de reposição.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.quantidade_perdida IS 'Quantidade efetivamente perdida ou refeita.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.custo_perda_retrabalho IS 'Impacto financeiro total da ocorrência.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.data_ocorrencia IS 'Data efetiva da perda; usa emissão da NF quando ausente.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.funcionario_responsavel IS 'Nome do responsável identificado.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.usuario_lancamento IS 'Nome de quem lançou a ocorrência no sistema.';
COMMENT ON COLUMN analytics.vw_perdas_retrabalhos.origem IS 'Origem do lançamento. Ex.: MANUAL, API ou NF.';

-- -----------------------------------------------------------------------------
-- Despesas fixas ativas e vigentes hoje.
-- -----------------------------------------------------------------------------
CREATE VIEW analytics.vw_despesas_fixas_vigentes AS
SELECT
  d.id_despesa_fixa,
  d.id_empresa,
  d.id_plano_contas,
  d.descricao,
  d.valor_mensal,
  d.dia_vencimento,
  d.data_inicio,
  d.data_fim,
  d.ativo,
  d.id_usuario_criacao,
  d.criado_em,
  d.id_usuario_alteracao,
  d.alterado_em,
  d.observacao,
  p.tipo_conta,
  p.categoria,
  p.subcategoria
FROM analytics.cad_despesa_fixa d
LEFT JOIN analytics.dim_plano_contas p
  ON p.id_conta = d.id_plano_contas
WHERE COALESCE(d.ativo, TRUE) = TRUE
  AND d.data_inicio <= CURRENT_DATE
  AND (d.data_fim IS NULL OR d.data_fim >= CURRENT_DATE);

COMMENT ON VIEW analytics.vw_despesas_fixas_vigentes IS 'Despesas fixas ativas e vigentes na data atual, enriquecidas pelo plano de contas.';
COMMENT ON COLUMN analytics.vw_despesas_fixas_vigentes.valor_mensal IS 'Valor mensal vigente da despesa.';
COMMENT ON COLUMN analytics.vw_despesas_fixas_vigentes.dia_vencimento IS 'Dia habitual de vencimento no mês. Ex.: 10.';
COMMENT ON COLUMN analytics.vw_despesas_fixas_vigentes.data_fim IS 'Fim da vigência; NULL quando indeterminado.';
COMMENT ON COLUMN analytics.vw_despesas_fixas_vigentes.tipo_conta IS 'Natureza no plano de contas. Ex.: DESPESA FIXA.';
COMMENT ON COLUMN analytics.vw_despesas_fixas_vigentes.categoria IS 'Categoria gerencial. Ex.: Estrutura.';
COMMENT ON COLUMN analytics.vw_despesas_fixas_vigentes.subcategoria IS 'Subcategoria gerencial. Ex.: Aluguel.';

-- -----------------------------------------------------------------------------
-- Fonte dos selects em cascata do CRUD de vendas.
-- -----------------------------------------------------------------------------
CREATE VIEW dt_catalogo.vw_produtos_dropdown AS
SELECT
  id_produto,
  linha,
  produto,
  cor,
  categoria,
  descricao,
  unidade_venda
FROM dt_catalogo.ctl_produtos
WHERE ativo = TRUE;

COMMENT ON VIEW dt_catalogo.vw_produtos_dropdown IS 'Fonte pronta para selects em cascata do CRUD de vendas.';
