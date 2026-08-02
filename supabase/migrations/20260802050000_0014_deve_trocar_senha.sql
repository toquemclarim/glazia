-- Exige troca de senha no primeiro acesso (senha temporária Ops/Equipe).
ALTER TABLE analytics.ctl_usuario
  ADD COLUMN IF NOT EXISTS deve_trocar_senha boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN analytics.ctl_usuario.deve_trocar_senha IS
  'TRUE quando o usuário ainda precisa definir a própria senha (1º acesso).';

-- Usuários de tenant que nunca alteraram credenciais passam a trocar no próximo login.
UPDATE analytics.ctl_usuario
SET deve_trocar_senha = TRUE
WHERE cargo <> 'PLATFORM'
  AND alterado_em IS NULL
  AND deve_trocar_senha = FALSE;
