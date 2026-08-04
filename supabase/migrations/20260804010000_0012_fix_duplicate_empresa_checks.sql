-- Remove constraints antigas que conflitam com TRIAL / inativa
ALTER TABLE analytics.dim_empresa
  DROP CONSTRAINT IF EXISTS dim_empresa_plano_chk;

ALTER TABLE analytics.dim_empresa
  DROP CONSTRAINT IF EXISTS dim_empresa_status_chk;

ALTER TABLE analytics.dim_empresa
  DROP CONSTRAINT IF EXISTS dim_empresa_plano_assinatura_check;

ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_plano_assinatura_check
  CHECK (
    plano_assinatura IS NULL
    OR plano_assinatura IN ('TRIAL', 'BASIC', 'STANDARD', 'PRO')
  );

ALTER TABLE analytics.dim_empresa
  DROP CONSTRAINT IF EXISTS dim_empresa_status_assinatura_check;

ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_status_assinatura_check
  CHECK (status_assinatura IN ('ativa', 'trial', 'inativa', 'suspensa', 'cancelada'));
