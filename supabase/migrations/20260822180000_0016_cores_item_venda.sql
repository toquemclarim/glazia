-- =============================================================================
-- Cores de perfil / vidro / acessório no item da venda.
-- SKU cartesiano NÃO é expandido. Linhas PERGUNTAR ganham âncora cor='GERAL'.
-- =============================================================================

BEGIN;

-- —— Política por linha comercial ——
ALTER TABLE dt_catalogo.dim_linha
  ADD COLUMN IF NOT EXISTS cor_principal text NOT NULL DEFAULT 'PERGUNTAR';

ALTER TABLE dt_catalogo.dim_linha
  DROP CONSTRAINT IF EXISTS dim_linha_cor_principal_chk;
ALTER TABLE dt_catalogo.dim_linha
  ADD CONSTRAINT dim_linha_cor_principal_chk
  CHECK (cor_principal IN ('PERFIL', 'VIDRO', 'PERGUNTAR'));

UPDATE dt_catalogo.dim_linha
SET cor_principal = CASE codigo
  WHEN 'GOLD' THEN 'PERFIL'
  WHEN 'SUPREMA' THEN 'PERFIL'
  WHEN '25' THEN 'PERFIL'
  WHEN 'TEMPERADO' THEN 'VIDRO'
  ELSE 'PERGUNTAR'
END;

COMMENT ON COLUMN dt_catalogo.dim_linha.cor_principal IS
  'PERFIL/VIDRO = tipo fixo no lançamento; PERGUNTAR = o usuário escolhe o tipo da cor principal.';

-- —— dim_cor: acessório + códigos compartilhados ——
ALTER TABLE dt_catalogo.dim_cor
  DROP CONSTRAINT IF EXISTS dim_cor_aplicavel_chk;
ALTER TABLE dt_catalogo.dim_cor
  ADD CONSTRAINT dim_cor_aplicavel_chk
  CHECK (aplicavel_a IN ('PERFIL', 'VIDRO', 'ACESSORIO', 'AMBOS'));

UPDATE dt_catalogo.dim_cor
SET aplicavel_a = 'AMBOS'
WHERE codigo IN (
  'BRONZE', 'PRETO', 'BRANCO', 'CHAMPAGNE', 'PRATA', 'GRAFITE',
  'AZUL MARINHO', 'NATURAL/ALUMÍNIO', 'AÇO CORTEN', 'GERAL'
);

INSERT INTO dt_catalogo.dim_cor (codigo, nome, familia_cor, aplicavel_a) VALUES
  ('CROMO', 'Cromo', 'METALICO', 'ACESSORIO'),
  ('INOX ESCOVADO', 'Inox escovado', 'METALICO', 'ACESSORIO'),
  ('INOX POLIDO', 'Inox polido', 'METALICO', 'ACESSORIO'),
  ('ESCOVADO', 'Escovado', 'METALICO', 'AMBOS'),
  ('POLIDO', 'Polido', 'METALICO', 'AMBOS')
ON CONFLICT (codigo) DO UPDATE
SET nome = EXCLUDED.nome,
    familia_cor = EXCLUDED.familia_cor,
    aplicavel_a = EXCLUDED.aplicavel_a;

INSERT INTO dt_catalogo.dim_cor (codigo, nome, familia_cor, aplicavel_a) VALUES
  ('GERAL', 'Geral', 'NEUTRO', 'AMBOS')
ON CONFLICT (codigo) DO UPDATE
SET aplicavel_a = 'AMBOS';

-- —— SKU sentinela GERAL nas linhas que perguntam o tipo ——
INSERT INTO dt_catalogo.ctl_produtos (
  linha, produto, cor, categoria, descricao, unidade_venda,
  familia, marca, acabamento, segmento, ativo
)
SELECT DISTINCT ON (p.linha, p.produto)
  p.linha,
  p.produto,
  'GERAL',
  p.categoria,
  COALESCE(p.descricao, p.produto),
  p.unidade_venda,
  p.familia,
  p.marca,
  p.acabamento,
  p.segmento,
  TRUE
FROM dt_catalogo.ctl_produtos p
INNER JOIN dt_catalogo.dim_linha l ON l.codigo = p.linha
WHERE l.cor_principal = 'PERGUNTAR'
  AND p.cor IS DISTINCT FROM 'GERAL'
  AND p.ativo = TRUE
ORDER BY p.linha, p.produto, p.id_produto
ON CONFLICT (linha, produto, cor) DO NOTHING;

-- —— Colunas no fato (nullable até o backfill) ——
ALTER TABLE analytics.fato_venda_item
  ADD COLUMN IF NOT EXISTS tipo_cor_principal text,
  ADD COLUMN IF NOT EXISTS cor_perfil text,
  ADD COLUMN IF NOT EXISTS cor_vidro text,
  ADD COLUMN IF NOT EXISTS cor_acessorio text;

UPDATE analytics.fato_venda_item i
SET
  tipo_cor_principal = CASE
    WHEN UPPER(COALESCE(i.linha_produto, cp.linha, '')) = 'TEMPERADO'
      THEN 'VIDRO'
    ELSE 'PERFIL'
  END,
  cor_perfil = CASE
    WHEN UPPER(COALESCE(i.linha_produto, cp.linha, '')) = 'TEMPERADO'
      THEN NULL
    ELSE COALESCE(NULLIF(BTRIM(cp.cor), ''), 'GERAL')
  END,
  cor_vidro = CASE
    WHEN UPPER(COALESCE(i.linha_produto, cp.linha, '')) = 'TEMPERADO'
      THEN COALESCE(NULLIF(BTRIM(cp.cor), ''), 'GERAL')
    ELSE NULL
  END,
  cor_acessorio = NULL
FROM dt_catalogo.ctl_produtos cp
WHERE i.id_produto LIKE 'ctl_%'
  AND cp.id_produto = NULLIF(regexp_replace(i.id_produto, '^ctl_', ''), '')::int
  AND i.tipo_cor_principal IS NULL;

-- Itens sem SKU de catálogo (id_produto legado)
UPDATE analytics.fato_venda_item i
SET
  tipo_cor_principal = CASE
    WHEN UPPER(COALESCE(i.linha_produto, '')) = 'TEMPERADO' THEN 'VIDRO'
    ELSE 'PERFIL'
  END,
  cor_perfil = CASE
    WHEN UPPER(COALESCE(i.linha_produto, '')) = 'TEMPERADO' THEN NULL
    ELSE 'GERAL'
  END,
  cor_vidro = CASE
    WHEN UPPER(COALESCE(i.linha_produto, '')) = 'TEMPERADO' THEN 'GERAL'
    ELSE NULL
  END
WHERE i.tipo_cor_principal IS NULL;

ALTER TABLE analytics.fato_venda_item
  ALTER COLUMN tipo_cor_principal SET NOT NULL;

ALTER TABLE analytics.fato_venda_item
  DROP CONSTRAINT IF EXISTS fato_venda_item_tipo_cor_chk;
ALTER TABLE analytics.fato_venda_item
  ADD CONSTRAINT fato_venda_item_tipo_cor_chk
  CHECK (tipo_cor_principal IN ('PERFIL', 'VIDRO', 'ACESSORIO'));

ALTER TABLE analytics.fato_venda_item
  DROP CONSTRAINT IF EXISTS fato_venda_item_cor_principal_chk;
ALTER TABLE analytics.fato_venda_item
  ADD CONSTRAINT fato_venda_item_cor_principal_chk
  CHECK (
    (tipo_cor_principal = 'PERFIL' AND cor_perfil IS NOT NULL)
    OR (tipo_cor_principal = 'VIDRO' AND cor_vidro IS NOT NULL)
    OR (tipo_cor_principal = 'ACESSORIO' AND cor_acessorio IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS fato_venda_item_tipo_cor_idx
  ON analytics.fato_venda_item (id_empresa, tipo_cor_principal);
CREATE INDEX IF NOT EXISTS fato_venda_item_cor_perfil_idx
  ON analytics.fato_venda_item (id_empresa, cor_perfil)
  WHERE cor_perfil IS NOT NULL;
CREATE INDEX IF NOT EXISTS fato_venda_item_cor_vidro_idx
  ON analytics.fato_venda_item (id_empresa, cor_vidro)
  WHERE cor_vidro IS NOT NULL;

COMMENT ON COLUMN analytics.fato_venda_item.tipo_cor_principal IS
  'Qual slot é a cor comercial principal deste item.';
COMMENT ON COLUMN analytics.fato_venda_item.cor_perfil IS
  'Cor do perfil. NULL = não informada.';
COMMENT ON COLUMN analytics.fato_venda_item.cor_vidro IS
  'Cor do vidro. NULL = não informada.';
COMMENT ON COLUMN analytics.fato_venda_item.cor_acessorio IS
  'Cor dos acessórios. NULL = não informada.';

-- —— View analítica ——
DROP VIEW IF EXISTS analytics.vw_venda_itens;

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
  i.tipo_cor_principal,
  i.cor_perfil,
  i.cor_vidro,
  i.cor_acessorio,
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

COMMENT ON VIEW analytics.vw_venda_itens IS
  'Itens de venda enriquecidos. Cores vêm do fato (não do SKU). NULL no slot = não informado.';
COMMENT ON COLUMN analytics.vw_venda_itens.tipo_cor_principal IS 'PERFIL, VIDRO ou ACESSORIO.';
COMMENT ON COLUMN analytics.vw_venda_itens.cor_perfil IS 'Cor do perfil; NULL se não informada.';
COMMENT ON COLUMN analytics.vw_venda_itens.cor_vidro IS 'Cor do vidro; NULL se não informada.';
COMMENT ON COLUMN analytics.vw_venda_itens.cor_acessorio IS 'Cor dos acessórios; NULL se não informada.';

COMMIT;
