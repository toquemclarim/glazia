-- =============================================================================
-- Clientes (matrícula 8 dígitos) + histórico de pagamento de custos fixos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dim_cliente: PF (nome completo) / PJ (razão social). PK = matrícula 8 dígitos.
-- -----------------------------------------------------------------------------
ALTER TABLE analytics.dim_cliente
  ADD COLUMN IF NOT EXISTS nome_completo text,
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

UPDATE analytics.dim_cliente
SET
  nome_completo = CASE
    WHEN tipo_pessoa = 'PF' OR tipo_pessoa IS NULL THEN COALESCE(nome_completo, nome)
    ELSE nome_completo
  END,
  razao_social = CASE
    WHEN tipo_pessoa = 'PJ' THEN COALESCE(razao_social, nome)
    ELSE razao_social
  END
WHERE nome IS NOT NULL;

ALTER TABLE analytics.dim_cliente
  DROP CONSTRAINT IF EXISTS dim_cliente_tipo_pessoa_chk;

ALTER TABLE analytics.dim_cliente
  ALTER COLUMN tipo_pessoa SET NOT NULL,
  ALTER COLUMN tipo_pessoa SET DEFAULT 'PF';

ALTER TABLE analytics.dim_cliente
  ADD CONSTRAINT dim_cliente_tipo_pessoa_chk
    CHECK (tipo_pessoa IN ('PF', 'PJ')),
  ADD CONSTRAINT dim_cliente_pf_chk
    CHECK (tipo_pessoa <> 'PF' OR (nome_completo IS NOT NULL AND btrim(nome_completo) <> '')),
  ADD CONSTRAINT dim_cliente_pj_chk
    CHECK (tipo_pessoa <> 'PJ' OR (razao_social IS NOT NULL AND btrim(razao_social) <> '')),
  ADD CONSTRAINT dim_cliente_matricula_chk
    CHECK (id_cliente ~ '^[0-9]{8}$');

COMMENT ON COLUMN analytics.dim_cliente.id_cliente IS 'Matrícula do cliente: 8 dígitos aleatórios. PK.';
COMMENT ON COLUMN analytics.dim_cliente.nome_completo IS 'Obrigatório quando tipo_pessoa = PF.';
COMMENT ON COLUMN analytics.dim_cliente.razao_social IS 'Obrigatório quando tipo_pessoa = PJ.';
COMMENT ON COLUMN analytics.dim_cliente.nome IS 'Nome de exibição (espelha nome_completo ou razao_social).';

-- Vendas antigas sem cliente: cria um placeholder e amarra, depois exige FK.
INSERT INTO analytics.dim_cliente
  (id_cliente, id_empresa, nome, tipo_pessoa, nome_completo, data_cadastro, ativo)
SELECT
  '00000001',
  e.id_empresa,
  'Cliente legado (migração)',
  'PF',
  'Cliente legado (migração)',
  CURRENT_DATE,
  TRUE
FROM analytics.dim_empresa e
WHERE NOT EXISTS (
  SELECT 1 FROM analytics.dim_cliente c
  WHERE c.id_cliente = '00000001' AND c.id_empresa = e.id_empresa
)
ON CONFLICT (id_cliente) DO NOTHING;

UPDATE analytics.fato_venda v
SET id_cliente = '00000001'
WHERE v.id_cliente IS NULL
  AND EXISTS (
    SELECT 1 FROM analytics.dim_cliente c
    WHERE c.id_cliente = '00000001' AND c.id_empresa = v.id_empresa
  );

ALTER TABLE analytics.fato_venda
  ALTER COLUMN id_cliente SET NOT NULL;

-- -----------------------------------------------------------------------------
-- Histórico de sinalização de pagamento de custos fixos (uma linha por quitação).
-- Liga-se à parcela do fluxo de caixa quando existir.
-- -----------------------------------------------------------------------------
CREATE TABLE analytics.hist_pagamento_despesa_fixa (
  id_pagamento     text PRIMARY KEY,
  id_empresa       text NOT NULL REFERENCES analytics.dim_empresa(id_empresa) ON UPDATE CASCADE,
  id_despesa_fixa  text NOT NULL REFERENCES analytics.cad_despesa_fixa(id_despesa_fixa) ON UPDATE CASCADE,
  id_transacao     text REFERENCES analytics.fato_fluxo_caixa(id_transacao) ON UPDATE CASCADE ON DELETE SET NULL,
  data_pagamento   date NOT NULL,
  competencia      date NOT NULL,
  valor_pago       numeric(14,2) NOT NULL,
  id_usuario       text,
  observacao       text,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hist_pag_despesa_valor_chk CHECK (valor_pago > 0)
);

COMMENT ON TABLE analytics.hist_pagamento_despesa_fixa IS
  'Registro de cada vez que o diretor/ADM sinaliza um custo fixo como pago.';
COMMENT ON COLUMN analytics.hist_pagamento_despesa_fixa.competencia IS
  'Mês de referência da parcela (normalmente o data_vencimento da previsão).';

CREATE INDEX hist_pag_despesa_empresa_idx
  ON analytics.hist_pagamento_despesa_fixa (id_empresa, data_pagamento DESC);
CREATE INDEX hist_pag_despesa_despesa_idx
  ON analytics.hist_pagamento_despesa_fixa (id_despesa_fixa, data_pagamento DESC);
CREATE UNIQUE INDEX hist_pag_despesa_transacao_uk
  ON analytics.hist_pagamento_despesa_fixa (id_transacao)
  WHERE id_transacao IS NOT NULL;

-- Limpa duplicatas de parcelas (bug antigo de regeneração) antes do UNIQUE.
WITH ranked AS (
  SELECT
    id_transacao,
    ROW_NUMBER() OVER (
      PARTITION BY id_despesa_fixa, data_vencimento
      ORDER BY
        CASE WHEN UPPER(status_financeiro) = 'PAGO' THEN 0 ELSE 1 END,
        criado_em DESC NULLS LAST,
        id_transacao
    ) AS rn
  FROM analytics.fato_fluxo_caixa
  WHERE id_despesa_fixa IS NOT NULL
    AND UPPER(status_financeiro) <> 'CANCELADO'
)
UPDATE analytics.fato_fluxo_caixa f
SET status_financeiro = 'CANCELADO',
    alterado_em = now()
FROM ranked r
WHERE f.id_transacao = r.id_transacao
  AND r.rn > 1;

-- Evita regenerar a mesma parcela duas vezes no fluxo.
CREATE UNIQUE INDEX IF NOT EXISTS fato_fluxo_despesa_venc_uk
  ON analytics.fato_fluxo_caixa (id_despesa_fixa, data_vencimento)
  WHERE id_despesa_fixa IS NOT NULL
    AND UPPER(status_financeiro) <> 'CANCELADO';

-- Próximos vencimentos (tela inicial do diretor).
CREATE INDEX fato_fluxo_proximos_venc_idx
  ON analytics.fato_fluxo_caixa (id_empresa, data_vencimento)
  WHERE UPPER(status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
    AND id_despesa_fixa IS NOT NULL;

ALTER TABLE analytics.hist_pagamento_despesa_fixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.hist_pagamento_despesa_fixa FORCE ROW LEVEL SECURITY;
REVOKE ALL ON analytics.hist_pagamento_despesa_fixa FROM anon, authenticated;
