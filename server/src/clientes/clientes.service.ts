import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { assertOperador } from '../auth/roles';
import { DatabaseService } from '../database/database.service';
import {
  AtualizarClienteDto,
  ClienteCamposDto,
  CriarClienteDto,
} from './dto/clientes.dto';

export type StatusClienteFiltro = 'ativos' | 'inativos' | 'todos';

type ClienteRow = {
  id_cliente: string;
  id_empresa: string;
  nome: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_completo: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  contato_nome: string | null;
  observacao: string | null;
  data_cadastro: string | null;
  ativo: boolean;
};

const SELECT_COLS = `
  id_cliente, id_empresa, nome, tipo_pessoa,
  nome_completo, razao_social, nome_fantasia,
  cpf, cnpj, rg, inscricao_estadual, inscricao_municipal,
  email, telefone, celular,
  cep, logradouro, numero, complemento, bairro, cidade, uf,
  contato_nome, observacao, data_cadastro, ativo
`;

function limparDoc(valor?: string | null): string | null {
  if (valor == null) return null;
  const digits = String(valor).replace(/\D/g, '');
  return digits.length ? digits : null;
}

function limparTexto(valor?: string | null, max = 160): string | null {
  if (valor == null) return null;
  const t = String(valor).trim();
  if (!t) return null;
  return t.slice(0, max);
}

@Injectable()
export class ClientesService {
  constructor(private readonly db: DatabaseService) {}

  private get tabela() {
    return this.db.table('dim_cliente');
  }

  private assertOperador(auth: AuthContext) {
    assertOperador(auth);
  }

  async listar(
    auth: AuthContext,
    q?: string,
    status: StatusClienteFiltro = 'ativos',
  ) {
    this.assertOperador(auth);
    const rows = await this.db.query<ClienteRow>(
      `
      SELECT ${SELECT_COLS}
      FROM ${this.tabela}
      WHERE id_empresa = @empresaId
        AND id_cliente <> '00000001'
        AND (
          @status = 'todos'
          OR (@status = 'ativos' AND COALESCE(ativo, TRUE) = TRUE)
          OR (@status = 'inativos' AND COALESCE(ativo, TRUE) = FALSE)
        )
        AND (
          @q::text IS NULL
          OR nome ILIKE '%' || @q || '%'
          OR COALESCE(nome_completo, '') ILIKE '%' || @q || '%'
          OR COALESCE(razao_social, '') ILIKE '%' || @q || '%'
          OR COALESCE(nome_fantasia, '') ILIKE '%' || @q || '%'
          OR COALESCE(cpf, '') ILIKE '%' || @q || '%'
          OR COALESCE(cnpj, '') ILIKE '%' || @q || '%'
          OR COALESCE(email, '') ILIKE '%' || @q || '%'
          OR id_cliente ILIKE '%' || @q || '%'
        )
      ORDER BY ativo DESC, nome
    `,
      {
        empresaId: auth.empresaId,
        q: q?.trim() || null,
        status,
      },
    );

    return { itens: rows.map((r) => this.toDto(r)), status };
  }

  async obter(auth: AuthContext, id: string) {
    this.assertOperador(auth);
    const row = await this.buscarNaEmpresa(auth.empresaId, id);
    return this.toDto(row);
  }

  async criar(auth: AuthContext, dto: CriarClienteDto) {
    this.assertOperador(auth);
    const dados = this.normalizar(dto);

    await this.assertDocumentoUnico(auth.empresaId, dados.cpf, dados.cnpj);

    const matricula = await this.gerarMatricula();

    await this.db.insert(this.tabela, [
      {
        id_cliente: matricula,
        id_empresa: auth.empresaId,
        ...dados,
        data_cadastro: new Date().toISOString().slice(0, 10),
        ativo: true,
        score_credito: null,
        alterado_em: new Date().toISOString(),
      },
    ]);

    const criado = await this.buscarNaEmpresa(auth.empresaId, matricula);
    return {
      ...this.toDto(criado),
      mensagem: `Cliente cadastrado · matrícula ${matricula}`,
    };
  }

  async atualizar(auth: AuthContext, id: string, dto: AtualizarClienteDto) {
    this.assertOperador(auth);
    await this.buscarNaEmpresa(auth.empresaId, id);
    const dados = this.normalizar(dto);

    await this.assertDocumentoUnico(
      auth.empresaId,
      dados.cpf,
      dados.cnpj,
      id,
    );

    await this.db.query(
      `
      UPDATE ${this.tabela}
      SET
        nome = @nome,
        tipo_pessoa = @tipoPessoa,
        nome_completo = @nomeCompleto,
        razao_social = @razaoSocial,
        nome_fantasia = @nomeFantasia,
        cpf = @cpf,
        cnpj = @cnpj,
        rg = @rg,
        inscricao_estadual = @inscricaoEstadual,
        inscricao_municipal = @inscricaoMunicipal,
        email = @email,
        telefone = @telefone,
        celular = @celular,
        cep = @cep,
        logradouro = @logradouro,
        numero = @numero,
        complemento = @complemento,
        bairro = @bairro,
        cidade = @cidade,
        uf = @uf,
        contato_nome = @contatoNome,
        observacao = @observacao,
        alterado_em = now()
      WHERE id_cliente = @id AND id_empresa = @empresaId
    `,
      {
        id,
        empresaId: auth.empresaId,
        nome: dados.nome,
        tipoPessoa: dados.tipo_pessoa,
        nomeCompleto: dados.nome_completo,
        razaoSocial: dados.razao_social,
        nomeFantasia: dados.nome_fantasia,
        cpf: dados.cpf,
        cnpj: dados.cnpj,
        rg: dados.rg,
        inscricaoEstadual: dados.inscricao_estadual,
        inscricaoMunicipal: dados.inscricao_municipal,
        email: dados.email,
        telefone: dados.telefone,
        celular: dados.celular,
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
        contatoNome: dados.contato_nome,
        observacao: dados.observacao,
      },
    );

    const atualizado = await this.buscarNaEmpresa(auth.empresaId, id);
    return {
      ...this.toDto(atualizado),
      mensagem: 'Dados cadastrais atualizados',
    };
  }

  async desativar(auth: AuthContext, id: string) {
    this.assertOperador(auth);
    await this.buscarNaEmpresa(auth.empresaId, id);

    await this.db.query(
      `
      UPDATE ${this.tabela}
      SET ativo = FALSE, alterado_em = now()
      WHERE id_cliente = @id AND id_empresa = @empresaId
    `,
      { id, empresaId: auth.empresaId },
    );

    return { id, mensagem: 'Cliente desativado' };
  }

  async reativar(auth: AuthContext, id: string) {
    this.assertOperador(auth);
    await this.buscarNaEmpresa(auth.empresaId, id, true);

    await this.db.query(
      `
      UPDATE ${this.tabela}
      SET ativo = TRUE, alterado_em = now()
      WHERE id_cliente = @id AND id_empresa = @empresaId
    `,
      { id, empresaId: auth.empresaId },
    );

    return { id, mensagem: 'Cliente reativado' };
  }

  private normalizar(dto: ClienteCamposDto) {
    const nome = dto.nome.trim();
    if (nome.length < 2) {
      throw new BadRequestException('Informe o nome do cliente');
    }

    const nomeCompleto =
      limparTexto(dto.nomeCompleto) ??
      (dto.tipoPessoa === 'PF' ? nome : null);
    const razaoSocial =
      limparTexto(dto.razaoSocial) ??
      (dto.tipoPessoa === 'PJ' ? nome : null);

    return {
      nome,
      tipo_pessoa: dto.tipoPessoa,
      nome_completo: dto.tipoPessoa === 'PF' ? nomeCompleto : null,
      razao_social: dto.tipoPessoa === 'PJ' ? razaoSocial : null,
      nome_fantasia:
        dto.tipoPessoa === 'PJ' ? limparTexto(dto.nomeFantasia) : null,
      cpf: dto.tipoPessoa === 'PF' ? limparDoc(dto.cpf) : null,
      cnpj: dto.tipoPessoa === 'PJ' ? limparDoc(dto.cnpj) : null,
      rg: dto.tipoPessoa === 'PF' ? limparTexto(dto.rg, 30) : null,
      inscricao_estadual:
        dto.tipoPessoa === 'PJ'
          ? limparTexto(dto.inscricaoEstadual, 30)
          : null,
      inscricao_municipal:
        dto.tipoPessoa === 'PJ'
          ? limparTexto(dto.inscricaoMunicipal, 30)
          : null,
      email: limparTexto(dto.email)?.toLowerCase() ?? null,
      telefone: limparTexto(dto.telefone, 30),
      celular: limparTexto(dto.celular, 30),
      cep: limparDoc(dto.cep),
      logradouro: limparTexto(dto.logradouro),
      numero: limparTexto(dto.numero, 20),
      complemento: limparTexto(dto.complemento, 80),
      bairro: limparTexto(dto.bairro, 80),
      cidade: limparTexto(dto.cidade, 80),
      uf: limparTexto(dto.uf, 2)?.toUpperCase() ?? null,
      contato_nome: limparTexto(dto.contatoNome, 120),
      observacao: limparTexto(dto.observacao, 500),
    };
  }

  private async assertDocumentoUnico(
    empresaId: string,
    cpf: string | null,
    cnpj: string | null,
    excetoId?: string,
  ) {
    if (cpf) {
      const [dup] = await this.db.query<{ id_cliente: string }>(
        `
        SELECT id_cliente FROM ${this.tabela}
        WHERE id_empresa = @empresaId
          AND cpf = @cpf
          AND (@excetoId::text IS NULL OR id_cliente <> @excetoId)
        LIMIT 1
      `,
        { empresaId, cpf, excetoId: excetoId ?? null },
      );
      if (dup) {
        throw new BadRequestException(
          'Já existe um cliente com este CPF nesta empresa',
        );
      }
    }
    if (cnpj) {
      const [dup] = await this.db.query<{ id_cliente: string }>(
        `
        SELECT id_cliente FROM ${this.tabela}
        WHERE id_empresa = @empresaId
          AND cnpj = @cnpj
          AND (@excetoId::text IS NULL OR id_cliente <> @excetoId)
        LIMIT 1
      `,
        { empresaId, cnpj, excetoId: excetoId ?? null },
      );
      if (dup) {
        throw new BadRequestException(
          'Já existe um cliente com este CNPJ nesta empresa',
        );
      }
    }
  }

  private async buscarNaEmpresa(
    empresaId: string,
    id: string,
    permitirInativo = true,
  ) {
    const [row] = await this.db.query<ClienteRow>(
      `
      SELECT ${SELECT_COLS}
      FROM ${this.tabela}
      WHERE id_cliente = @id AND id_empresa = @empresaId
        AND (@permitirInativo OR COALESCE(ativo, TRUE) = TRUE)
      LIMIT 1
    `,
      { id, empresaId, permitirInativo },
    );
    if (!row) throw new NotFoundException('Cliente não encontrado');
    return row;
  }

  private async gerarMatricula(): Promise<string> {
    for (let tentativa = 0; tentativa < 40; tentativa += 1) {
      const candidata = String(
        Math.floor(10_000_000 + Math.random() * 90_000_000),
      );
      const [existe] = await this.db.query<{ id_cliente: string }>(
        `
        SELECT id_cliente FROM ${this.tabela}
        WHERE id_cliente = @id
        LIMIT 1
      `,
        { id: candidata },
      );
      if (!existe) return candidata;
    }
    throw new BadRequestException(
      'Não foi possível gerar uma matrícula única. Tente novamente.',
    );
  }

  private toDto(row: ClienteRow) {
    return {
      id: row.id_cliente,
      matricula: row.id_cliente,
      tipoPessoa: row.tipo_pessoa,
      nome: row.nome,
      nomeCompleto: row.nome_completo,
      razaoSocial: row.razao_social,
      nomeFantasia: row.nome_fantasia,
      cpf: row.cpf,
      cnpj: row.cnpj,
      rg: row.rg,
      inscricaoEstadual: row.inscricao_estadual,
      inscricaoMunicipal: row.inscricao_municipal,
      email: row.email,
      telefone: row.telefone,
      celular: row.celular,
      cep: row.cep,
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      cidade: row.cidade,
      uf: row.uf,
      contatoNome: row.contato_nome,
      observacao: row.observacao,
      dataCadastro: row.data_cadastro,
      ativo: row.ativo,
    };
  }
}
