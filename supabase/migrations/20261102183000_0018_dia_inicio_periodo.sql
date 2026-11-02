-- Dia em que começa o mês comercial da empresa (1 = calendário civil).
ALTER TABLE analytics.dim_empresa
  ADD COLUMN IF NOT EXISTS dia_inicio_periodo integer NOT NULL DEFAULT 1;

ALTER TABLE analytics.dim_empresa
  DROP CONSTRAINT IF EXISTS dim_empresa_dia_inicio_periodo_check;

ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_dia_inicio_periodo_check
  CHECK (dia_inicio_periodo BETWEEN 1 AND 28);

COMMENT ON COLUMN analytics.dim_empresa.dia_inicio_periodo IS
  'Dia de início do mês na análise (1 = dia 1 ao último dia). O período rotulado pelo mês M vai do dia D de M até a véspera do dia D do mês seguinte.';
