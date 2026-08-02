-- Planos comerciais: BASIC / STANDARD / PRO
ALTER TABLE analytics.dim_empresa DROP CONSTRAINT IF EXISTS dim_empresa_plano_chk;

UPDATE analytics.dim_empresa
SET plano_assinatura = CASE plano_assinatura
  WHEN 'STARTER' THEN 'BASIC'
  WHEN 'PRO' THEN 'STANDARD'
  WHEN 'ENTERPRISE' THEN 'PRO'
  ELSE plano_assinatura
END
WHERE plano_assinatura IN ('STARTER', 'PRO', 'ENTERPRISE');

UPDATE analytics.dim_empresa
SET plano_assinatura = 'PRO'
WHERE id_empresa = 'glazia-platform';

ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_plano_chk
  CHECK (
    plano_assinatura IS NULL
    OR plano_assinatura IN ('BASIC', 'STANDARD', 'PRO')
  );
