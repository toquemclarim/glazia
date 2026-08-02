-- Cargo VENDAS: operação comercial (lançamentos/clientes), sem gestão financeira/equipe.
ALTER TABLE analytics.ctl_usuario DROP CONSTRAINT IF EXISTS ctl_usuario_cargo_chk;
ALTER TABLE analytics.ctl_usuario
  ADD CONSTRAINT ctl_usuario_cargo_chk
  CHECK (cargo IN ('ADM', 'DIRETOR', 'SOCIO', 'VENDAS'));
