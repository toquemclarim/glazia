-- Custos variáveis de campo (viagem, alimentação, combustível, etc.)
-- e item PEDREIRO em terceirização. OUTROS = descrição livre no lançamento.

INSERT INTO dt_catalogo.dim_tipo_custo (codigo, nome, grupo_bi, descricao) VALUES
  ('TAXAS DE VIAGEM', 'Taxas de viagem', 'LOGISTICA', 'Pedágio, embarcação, aluguel de veículo e deslocamento.'),
  ('ALIMENTACAO', 'Alimentação', 'APOIO', 'Refeições de equipe em obra ou deslocamento.'),
  ('COMBUSTÍVEL', 'Combustível', 'LOGISTICA', 'Abastecimento da frota e equipamentos.'),
  ('MANUTENCAO VEICULO', 'Manutenção de veículo', 'APOIO', 'Óleo, pneu e conservação da frota.'),
  ('TRANSPORTE', 'Transporte', 'LOGISTICA', 'Corridas, motofrete e deslocamento pontual.'),
  ('OUTROS', 'Outros', 'APOIO', 'Custo variável avulso com descrição livre.')
ON CONFLICT (codigo) DO UPDATE
  SET nome = EXCLUDED.nome,
      grupo_bi = EXCLUDED.grupo_bi,
      descricao = EXCLUDED.descricao;

INSERT INTO dt_catalogo.ctl_custos (
  tipo_custo, descricao, linha, produto, cor, espessura, tipo_vidro,
  unidade_custo, marca, subtipo, acabamento, codigo_interno, origem
) VALUES
  ('TERCEIRIZACAO', 'Pedreiro', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TERCEIRIZACAO', NULL, 'CST-VAR-001', 'TERCEIRO'),

  ('TAXAS DE VIAGEM', 'Pedágio', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TAXAS DE VIAGEM', NULL, 'CST-VAR-010', 'COMPRA'),
  ('TAXAS DE VIAGEM', 'Embarcação', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TAXAS DE VIAGEM', NULL, 'CST-VAR-011', 'COMPRA'),
  ('TAXAS DE VIAGEM', 'Aluguel de veículo', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TAXAS DE VIAGEM', NULL, 'CST-VAR-012', 'COMPRA'),
  ('TAXAS DE VIAGEM', 'Estacionamento', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TAXAS DE VIAGEM', NULL, 'CST-VAR-013', 'COMPRA'),
  ('TAXAS DE VIAGEM', 'Hospedagem', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TAXAS DE VIAGEM', NULL, 'CST-VAR-014', 'COMPRA'),

  ('ALIMENTACAO', 'Almoço', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'ALIMENTACAO', NULL, 'CST-VAR-020', 'COMPRA'),
  ('ALIMENTACAO', 'Lanche', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'ALIMENTACAO', NULL, 'CST-VAR-021', 'COMPRA'),
  ('ALIMENTACAO', 'Jantar', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'ALIMENTACAO', NULL, 'CST-VAR-022', 'COMPRA'),

  ('COMBUSTÍVEL', 'Álcool/Etanol', 'GERAL', NULL, NULL, NULL, NULL, 'L', 'GENERICA', 'COMBUSTÍVEL', NULL, 'CST-VAR-030', 'COMPRA'),
  ('COMBUSTÍVEL', 'Gasolina', 'GERAL', NULL, NULL, NULL, NULL, 'L', 'GENERICA', 'COMBUSTÍVEL', NULL, 'CST-VAR-031', 'COMPRA'),
  ('COMBUSTÍVEL', 'Gás', 'GERAL', NULL, NULL, NULL, NULL, 'L', 'GENERICA', 'COMBUSTÍVEL', NULL, 'CST-VAR-032', 'COMPRA'),
  ('COMBUSTÍVEL', 'Diesel', 'GERAL', NULL, NULL, NULL, NULL, 'L', 'GENERICA', 'COMBUSTÍVEL', NULL, 'CST-VAR-033', 'COMPRA'),

  ('MANUTENCAO VEICULO', 'Óleo', 'GERAL', NULL, NULL, NULL, NULL, 'L', 'GENERICA', 'MANUTENCAO VEICULO', NULL, 'CST-VAR-040', 'COMPRA'),
  ('MANUTENCAO VEICULO', 'Pneu', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'MANUTENCAO VEICULO', NULL, 'CST-VAR-041', 'COMPRA'),
  ('MANUTENCAO VEICULO', 'Lavagem', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'MANUTENCAO VEICULO', NULL, 'CST-VAR-042', 'COMPRA'),

  ('TRANSPORTE', 'Uber/Táxi', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TRANSPORTE', NULL, 'CST-VAR-050', 'COMPRA'),
  ('TRANSPORTE', 'Motofrete', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'TRANSPORTE', NULL, 'CST-VAR-051', 'COMPRA'),

  ('OUTROS', 'Descrição livre', 'GERAL', NULL, NULL, NULL, NULL, 'UN', 'GENERICA', 'OUTROS', NULL, 'CST-VAR-090', 'COMPRA')
ON CONFLICT (codigo_interno) WHERE codigo_interno IS NOT NULL DO NOTHING;
