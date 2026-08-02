-- Cadastro completo PF/PJ: só `nome` é obrigatório. Isolamento por id_empresa.

ALTER TABLE analytics.dim_cliente
  DROP CONSTRAINT IF EXISTS dim_cliente_pf_chk,
  DROP CONSTRAINT IF EXISTS dim_cliente_pj_chk;

ALTER TABLE analytics.dim_cliente
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS celular text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS contato_nome text,
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS alterado_em timestamptz;

-- Nome de exibição sempre obrigatório.
ALTER TABLE analytics.dim_cliente
  DROP CONSTRAINT IF EXISTS dim_cliente_nome_chk;

ALTER TABLE analytics.dim_cliente
  ADD CONSTRAINT dim_cliente_nome_chk
    CHECK (nome IS NOT NULL AND btrim(nome) <> '');

ALTER TABLE analytics.dim_cliente
  DROP CONSTRAINT IF EXISTS dim_cliente_uf_chk;

ALTER TABLE analytics.dim_cliente
  ADD CONSTRAINT dim_cliente_uf_chk
    CHECK (uf IS NULL OR uf ~ '^[A-Za-z]{2}$');

-- Documento único por empresa (quando informado).
CREATE UNIQUE INDEX IF NOT EXISTS dim_cliente_empresa_cpf_uk
  ON analytics.dim_cliente (id_empresa, cpf)
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS dim_cliente_empresa_cnpj_uk
  ON analytics.dim_cliente (id_empresa, cnpj)
  WHERE cnpj IS NOT NULL AND btrim(cnpj) <> '';

CREATE INDEX IF NOT EXISTS dim_cliente_empresa_nome_idx
  ON analytics.dim_cliente (id_empresa, nome);

COMMENT ON COLUMN analytics.dim_cliente.nome IS
  'Único campo obrigatório no cadastro. Nome de exibição (PF ou PJ).';
COMMENT ON COLUMN analytics.dim_cliente.nome_completo IS
  'Opcional (PF). Se vazio, espelha nome.';
COMMENT ON COLUMN analytics.dim_cliente.razao_social IS
  'Opcional (PJ). Se vazio, espelha nome.';
