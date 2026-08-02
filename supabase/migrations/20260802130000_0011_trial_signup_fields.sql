-- Trial autocadastro + status inativa
ALTER TABLE analytics.dim_empresa
  ADD COLUMN IF NOT EXISTS trial_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS trial_fim timestamptz,
  ADD COLUMN IF NOT EXISTS razao_social text;

ALTER TABLE analytics.dim_empresa
  DROP CONSTRAINT IF EXISTS dim_empresa_status_assinatura_check;

ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_status_assinatura_check
  CHECK (status_assinatura IN ('ativa', 'trial', 'inativa', 'suspensa', 'cancelada'));

ALTER TABLE analytics.dim_empresa
  DROP CONSTRAINT IF EXISTS dim_empresa_plano_assinatura_check;

ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_plano_assinatura_check
  CHECK (
    plano_assinatura IS NULL
    OR plano_assinatura IN ('TRIAL', 'BASIC', 'STANDARD', 'PRO')
  );

COMMENT ON COLUMN analytics.dim_empresa.trial_inicio IS 'Início do período de avaliação (14 dias).';
COMMENT ON COLUMN analytics.dim_empresa.trial_fim IS 'Fim do trial. Após esta data o status passa a inativa.';
COMMENT ON COLUMN analytics.dim_empresa.razao_social IS 'Razão social opcional no autocadastro.';
