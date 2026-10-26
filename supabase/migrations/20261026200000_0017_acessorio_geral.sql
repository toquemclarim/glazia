-- Acessório "Geral" em todas as linhas: gasto abrangente de acessórios
-- sem item específico (puxador, kit, etc.) e sem mudar a cascata Tipo → Linha → Item.

INSERT INTO dt_catalogo.ctl_custos (
  tipo_custo, descricao, linha, produto, cor, espessura, tipo_vidro,
  unidade_custo, marca, subtipo, acabamento, codigo_interno, origem
)
SELECT
  'ACESSORIO',
  'Geral',
  l.linha,
  NULL,
  NULL,
  NULL,
  NULL,
  'UN',
  'GENERICA',
  'ACESSORIO',
  NULL,
  'CST-ACES-GERAL-' || replace(l.linha, ' ', '-'),
  'COMPRA'
FROM (
  SELECT codigo AS linha
  FROM dt_catalogo.dim_linha
  WHERE COALESCE(ativo, TRUE)
  UNION
  SELECT DISTINCT linha
  FROM dt_catalogo.ctl_custos
  WHERE UPPER(tipo_custo) = 'ACESSORIO'
    AND linha IS NOT NULL
) l
WHERE NOT EXISTS (
  SELECT 1
  FROM dt_catalogo.ctl_custos c
  WHERE UPPER(c.tipo_custo) = 'ACESSORIO'
    AND UPPER(BTRIM(c.descricao)) = 'GERAL'
    AND c.linha IS NOT DISTINCT FROM l.linha
)
ON CONFLICT (codigo_interno) WHERE codigo_interno IS NOT NULL DO NOTHING;
