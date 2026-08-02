-- Painel do dono do SaaS (Glazia Ops)
ALTER TABLE analytics.ctl_usuario DROP CONSTRAINT IF EXISTS ctl_usuario_cargo_chk;
ALTER TABLE analytics.ctl_usuario
  ADD CONSTRAINT ctl_usuario_cargo_chk
  CHECK (cargo IN ('ADM', 'DIRETOR', 'SOCIO', 'VENDAS', 'PLATFORM'));

ALTER TABLE analytics.dim_empresa
  ADD COLUMN IF NOT EXISTS status_assinatura text NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS contato_nome text,
  ADD COLUMN IF NOT EXISTS contato_email text,
  ADD COLUMN IF NOT EXISTS contato_telefone text,
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS criado_em timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS alterado_em timestamptz;

ALTER TABLE analytics.dim_empresa DROP CONSTRAINT IF EXISTS dim_empresa_status_chk;
ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_status_chk
  CHECK (status_assinatura IN ('ativa', 'trial', 'suspensa', 'cancelada'));

ALTER TABLE analytics.dim_empresa DROP CONSTRAINT IF EXISTS dim_empresa_plano_chk;
ALTER TABLE analytics.dim_empresa
  ADD CONSTRAINT dim_empresa_plano_chk
  CHECK (
    plano_assinatura IS NULL
    OR plano_assinatura IN ('STARTER', 'PRO', 'ENTERPRISE')
  );

INSERT INTO analytics.dim_empresa (
  id_empresa, nome_fantasia, plano_assinatura, data_onboarding,
  status_assinatura, contato_nome, contato_email
) VALUES (
  'glazia-platform',
  'Glazia Platform',
  'ENTERPRISE',
  CURRENT_DATE,
  'ativa',
  'Operações Glazia',
  'ops@glazia.com.br'
)
ON CONFLICT (id_empresa) DO NOTHING;

UPDATE analytics.dim_empresa
SET plano_assinatura = COALESCE(plano_assinatura, 'PRO'),
    status_assinatura = COALESCE(status_assinatura, 'ativa'),
    contato_nome = COALESCE(contato_nome, 'Diretor Glazia'),
    contato_email = COALESCE(contato_email, 'diretor@glazia.com.br')
WHERE id_empresa = 'empresa-demo-001';
