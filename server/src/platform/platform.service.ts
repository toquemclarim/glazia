import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthContext } from '../auth/auth-context';
import { hashPassword } from '../auth/password.util';
import { UsuariosStore } from '../auth/usuarios.store';
import { DatabaseService } from '../database/database.service';
import { DespesasFixasService } from '../despesas-fixas/despesas-fixas.service';
import type {
  AlterarStatusEmpresaDto,
  AtualizarEmpresaPlatformDto,
  CriarEmpresaPlatformDto,
} from './dto/platform.dto';
import {
  PLATFORM_EMPRESA_ID,
  type StatusAssinatura,
} from './platform.constants';

type EmpresaRow = {
  id_empresa: string;
  nome_fantasia: string;
  cnpj: string | null;
  plano_assinatura: string | null;
  data_onboarding: string | null;
  status_assinatura: StatusAssinatura;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  observacao: string | null;
  criado_em: Date | string | null;
  alterado_em: Date | string | null;
  usuarios_total: number;
  usuarios_ativos: number;
  ultimo_login: Date | string | null;
};

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly usuariosStore: UsuariosStore,
    private readonly despesasFixas: DespesasFixasService,
  ) {}

  private get tabelaEmpresa() {
    return this.db.table('dim_empresa');
  }

  async resumo() {
    const empresas = await this.listarEmpresas();
    return {
      totalEmpresas: empresas.length,
      ativas: empresas.filter((e) => e.status === 'ativa').length,
      trial: empresas.filter((e) => e.status === 'trial').length,
      suspensas: empresas.filter((e) => e.status === 'suspensa').length,
      canceladas: empresas.filter((e) => e.status === 'cancelada').length,
      usuariosAtivos: empresas.reduce((acc, e) => acc + e.usuariosAtivos, 0),
    };
  }

  async listarEmpresas() {
    const rows = await this.db.query<EmpresaRow>(
      `
      SELECT
        e.id_empresa,
        e.nome_fantasia,
        e.cnpj,
        e.plano_assinatura,
        e.data_onboarding::text AS data_onboarding,
        e.status_assinatura,
        e.contato_nome,
        e.contato_email,
        e.contato_telefone,
        e.observacao,
        e.criado_em,
        e.alterado_em,
        COALESCE(u.total, 0)::int AS usuarios_total,
        COALESCE(u.ativos, 0)::int AS usuarios_ativos,
        u.ultimo_login
      FROM ${this.tabelaEmpresa} e
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE c.ativo)::int AS ativos,
          MAX(d.ultimo_login) AS ultimo_login
        FROM ${this.db.table('ctl_usuario')} c
        LEFT JOIN ${this.db.table('dim_usuario')} d ON d.id_user = c.id_user
        WHERE c.id_empresa = e.id_empresa
          AND c.cargo <> 'PLATFORM'
      ) u ON TRUE
      WHERE e.id_empresa <> @platformId
      ORDER BY
        CASE e.status_assinatura
          WHEN 'suspensa' THEN 0
          WHEN 'trial' THEN 1
          WHEN 'ativa' THEN 2
          ELSE 3
        END,
        e.nome_fantasia
    `,
      { platformId: PLATFORM_EMPRESA_ID },
    );

    return rows.map((r) => this.toEmpresaDto(r));
  }

  async obterEmpresa(idEmpresa: string) {
    const [row] = await this.db.query<EmpresaRow>(
      `
      SELECT
        e.id_empresa,
        e.nome_fantasia,
        e.cnpj,
        e.plano_assinatura,
        e.data_onboarding::text AS data_onboarding,
        e.status_assinatura,
        e.contato_nome,
        e.contato_email,
        e.contato_telefone,
        e.observacao,
        e.criado_em,
        e.alterado_em,
        COALESCE(u.total, 0)::int AS usuarios_total,
        COALESCE(u.ativos, 0)::int AS usuarios_ativos,
        u.ultimo_login
      FROM ${this.tabelaEmpresa} e
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE c.ativo)::int AS ativos,
          MAX(d.ultimo_login) AS ultimo_login
        FROM ${this.db.table('ctl_usuario')} c
        LEFT JOIN ${this.db.table('dim_usuario')} d ON d.id_user = c.id_user
        WHERE c.id_empresa = e.id_empresa
          AND c.cargo <> 'PLATFORM'
      ) u ON TRUE
      WHERE e.id_empresa = @idEmpresa
        AND e.id_empresa <> @platformId
      LIMIT 1
    `,
      { idEmpresa, platformId: PLATFORM_EMPRESA_ID },
    );

    if (!row) throw new NotFoundException('Empresa não encontrada');
    return this.toEmpresaDto(row);
  }

  async criarEmpresa(dto: CriarEmpresaPlatformDto) {
    const emailDiretor = dto.diretorEmail.trim().toLowerCase();
    const conflito = await this.usuariosStore.findByEmailAny(emailDiretor);
    if (conflito) {
      throw new BadRequestException('E-mail do diretor já está em uso');
    }

    const idEmpresa = this.slugEmpresa(dto.nomeFantasia);
    const existente = await this.db.query<{ id_empresa: string }>(
      `SELECT id_empresa FROM ${this.tabelaEmpresa} WHERE id_empresa = @id LIMIT 1`,
      { id: idEmpresa },
    );
    const empresaId =
      existente.length > 0 ? `${idEmpresa}-${randomUUID().slice(0, 8)}` : idEmpresa;

    const trialInicio =
      dto.status === 'trial' ? new Date().toISOString() : null;
    const trialFim =
      dto.status === 'trial'
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    await this.db.query(
      `
      INSERT INTO ${this.tabelaEmpresa} (
        id_empresa, nome_fantasia, cnpj, plano_assinatura, data_onboarding,
        status_assinatura, contato_nome, contato_email, contato_telefone,
        observacao, trial_inicio, trial_fim, criado_em, alterado_em
      ) VALUES (
        @idEmpresa, @nome, @cnpj, @plano, CURRENT_DATE,
        @status, @contatoNome, @contatoEmail, @contatoTelefone,
        @observacao, @trialInicio, @trialFim, now(), NULL
      )
    `,
      {
        idEmpresa: empresaId,
        nome: dto.nomeFantasia.trim(),
        cnpj: dto.cnpj?.replace(/\D/g, '') || null,
        plano: dto.plano,
        status: dto.status,
        contatoNome: dto.contatoNome?.trim() || dto.diretorNome.trim(),
        contatoEmail: dto.contatoEmail?.trim().toLowerCase() || emailDiretor,
        contatoTelefone: dto.contatoTelefone?.trim() || null,
        observacao: dto.observacao?.trim() || null,
        trialInicio,
        trialFim,
      },
    );

    const diretor = await this.usuariosStore.createUsuario({
      idUser: `user-${randomUUID()}`,
      empresaId,
      email: emailDiretor,
      senhaHash: hashPassword(dto.diretorSenhaTemporaria),
      nomeCompleto: dto.diretorNome.trim(),
      cargo: 'DIRETOR',
    });

    let custosIniciais = 0;
    if (dto.comCustosIniciais !== false) {
      try {
        const authDiretor: AuthContext = {
          userId: diretor.id_user,
          email: diretor.email,
          empresaId,
          nomeCompleto: diretor.nome_completo,
          cargo: 'DIRETOR',
          dataNascimento: null,
        };
        const seed = await this.despesasFixas.seedTemplateVidracaria(authDiretor);
        custosIniciais = seed.quantidade;
      } catch (error) {
        this.logger.warn(
          `Seed de custos iniciais falhou para ${empresaId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const empresa = await this.obterEmpresa(empresaId);
    return {
      empresa,
      diretor: {
        idUser: diretor.id_user,
        email: diretor.email,
        nomeCompleto: diretor.nome_completo,
        cargo: diretor.cargo,
      },
      senhaTemporaria: dto.diretorSenhaTemporaria,
      custosIniciais,
    };
  }

  async atualizarEmpresa(idEmpresa: string, dto: AtualizarEmpresaPlatformDto) {
    await this.obterEmpresa(idEmpresa);

    await this.db.query(
      `
      UPDATE ${this.tabelaEmpresa}
      SET
        nome_fantasia = COALESCE(@nome, nome_fantasia),
        cnpj = CASE WHEN @cnpjSet THEN @cnpj ELSE cnpj END,
        plano_assinatura = COALESCE(@plano, plano_assinatura),
        contato_nome = CASE WHEN @contatoNomeSet THEN @contatoNome ELSE contato_nome END,
        contato_email = CASE WHEN @contatoEmailSet THEN @contatoEmail ELSE contato_email END,
        contato_telefone = CASE WHEN @contatoTelefoneSet THEN @contatoTelefone ELSE contato_telefone END,
        observacao = CASE WHEN @observacaoSet THEN @observacao ELSE observacao END,
        alterado_em = now()
      WHERE id_empresa = @idEmpresa
    `,
      {
        idEmpresa,
        nome: dto.nomeFantasia?.trim() ?? null,
        cnpjSet: dto.cnpj !== undefined,
        cnpj: dto.cnpj != null ? dto.cnpj.replace(/\D/g, '') || null : null,
        plano: dto.plano ?? null,
        contatoNomeSet: dto.contatoNome !== undefined,
        contatoNome: dto.contatoNome?.trim() || null,
        contatoEmailSet: dto.contatoEmail !== undefined,
        contatoEmail: dto.contatoEmail?.trim().toLowerCase() || null,
        contatoTelefoneSet: dto.contatoTelefone !== undefined,
        contatoTelefone: dto.contatoTelefone?.trim() || null,
        observacaoSet: dto.observacao !== undefined,
        observacao: dto.observacao?.trim() || null,
      },
    );

    return this.obterEmpresa(idEmpresa);
  }

  async alterarStatus(idEmpresa: string, dto: AlterarStatusEmpresaDto) {
    await this.obterEmpresa(idEmpresa);
    await this.db.query(
      `
      UPDATE ${this.tabelaEmpresa}
      SET status_assinatura = @status, alterado_em = now()
      WHERE id_empresa = @idEmpresa
    `,
      { idEmpresa, status: dto.status },
    );
    return this.obterEmpresa(idEmpresa);
  }

  async statusEmpresa(idEmpresa: string): Promise<StatusAssinatura | null> {
    const [row] = await this.db.query<{ status_assinatura: StatusAssinatura }>(
      `
      SELECT status_assinatura
      FROM ${this.tabelaEmpresa}
      WHERE id_empresa = @idEmpresa
      LIMIT 1
    `,
      { idEmpresa },
    );
    return row?.status_assinatura ?? null;
  }

  private slugEmpresa(nome: string) {
    const base = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    return base ? `empresa-${base}` : `empresa-${randomUUID().slice(0, 8)}`;
  }

  private toEmpresaDto(row: EmpresaRow) {
    return {
      idEmpresa: row.id_empresa,
      nomeFantasia: row.nome_fantasia,
      cnpj: row.cnpj,
      plano: (row.plano_assinatura ?? 'BASIC') as string,
      status: row.status_assinatura,
      dataOnboarding: row.data_onboarding,
      contatoNome: row.contato_nome,
      contatoEmail: row.contato_email,
      contatoTelefone: row.contato_telefone,
      observacao: row.observacao,
      usuariosTotal: Number(row.usuarios_total),
      usuariosAtivos: Number(row.usuarios_ativos),
      ultimoLogin: this.asIso(row.ultimo_login),
      criadoEm: this.asIso(row.criado_em),
      alteradoEm: this.asIso(row.alterado_em),
    };
  }

  private asIso(value: Date | string | null): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : String(value);
  }
}
