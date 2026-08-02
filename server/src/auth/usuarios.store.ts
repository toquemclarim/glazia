import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { allowAuthDemoSeed, type Environment } from '../config/env';
import { DatabaseService, type Queryable } from '../database/database.service';
import { hashPassword } from './password.util';

export type UsuarioAuthRow = {
  id_user: string;
  id_empresa: string;
  email: string;
  senha_hash: string;
  nome_completo: string;
  cargo: 'ADM' | 'DIRETOR' | 'SOCIO' | 'VENDAS' | 'PLATFORM';
  data_nascimento: string | null;
  ativo: boolean;
  deve_trocar_senha: boolean;
  criado_em: string;
  alterado_em: string | null;
};

type RawUsuario = Omit<
  UsuarioAuthRow,
  'criado_em' | 'alterado_em' | 'deve_trocar_senha' | 'ativo'
> & {
  criado_em: Date | string;
  alterado_em: Date | string | null;
  deve_trocar_senha: boolean | null;
  ativo: boolean | null;
};

const CAMPOS = `
  id_user, id_empresa, email, senha_hash, nome_completo, cargo,
  data_nascimento, ativo, COALESCE(deve_trocar_senha, FALSE) AS deve_trocar_senha,
  criado_em, alterado_em
`;

@Injectable()
export class UsuariosStore implements OnModuleInit {
  private readonly logger = new Logger(UsuariosStore.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private get tabela() {
    return this.db.table('ctl_usuario');
  }

  async onModuleInit() {
    try {
      await this.ensureSeeded();
      await this.ensurePlatformOperator();
    } catch (error) {
      this.logger.warn(
        `Não foi possível sincronizar ctl_usuario: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async getEmpresaStatus(empresaId: string): Promise<string | null> {
    const info = await this.getEmpresaAssinatura(empresaId);
    return info?.statusAssinatura ?? null;
  }

  async getEmpresaPlano(empresaId: string): Promise<string | null> {
    const info = await this.getEmpresaAssinatura(empresaId);
    return info?.planoAssinatura ?? null;
  }

  async getEmpresaAssinatura(empresaId: string): Promise<{
    statusAssinatura: string;
    planoAssinatura: string | null;
    trialInicio: string | null;
    trialFim: string | null;
    nomeFantasia: string;
  } | null> {
    const [row] = await this.db.query<{
      status_assinatura: string;
      plano_assinatura: string | null;
      trial_inicio: Date | string | null;
      trial_fim: Date | string | null;
      nome_fantasia: string;
    }>(
      `
      SELECT
        status_assinatura,
        plano_assinatura,
        trial_inicio,
        trial_fim,
        nome_fantasia
      FROM ${this.db.table('dim_empresa')}
      WHERE id_empresa = @empresaId
      LIMIT 1
    `,
      { empresaId },
    );
    if (!row) return null;
    return {
      statusAssinatura: row.status_assinatura,
      planoAssinatura: row.plano_assinatura,
      trialInicio: row.trial_inicio
        ? row.trial_inicio instanceof Date
          ? row.trial_inicio.toISOString()
          : String(row.trial_inicio)
        : null,
      trialFim: row.trial_fim
        ? row.trial_fim instanceof Date
          ? row.trial_fim.toISOString()
          : String(row.trial_fim)
        : null,
      nomeFantasia: row.nome_fantasia,
    };
  }

  /** Se o trial venceu, marca a empresa como inativa (dados preservados). */
  async expireTrialIfNeeded(empresaId: string): Promise<string | null> {
    const [row] = await this.db.query<{
      status_assinatura: string;
      trial_fim: Date | string | null;
    }>(
      `
      UPDATE ${this.db.table('dim_empresa')}
      SET status_assinatura = 'inativa',
          alterado_em = now()
      WHERE id_empresa = @empresaId
        AND status_assinatura = 'trial'
        AND trial_fim IS NOT NULL
        AND trial_fim <= now()
      RETURNING status_assinatura, trial_fim
    `,
      { empresaId },
    );
    if (row) return 'inativa';
    return this.getEmpresaStatus(empresaId);
  }

  async countActiveByEmpresa(empresaId: string): Promise<number> {
    const [row] = await this.db.query<{ total: string | number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM ${this.tabela}
      WHERE id_empresa = @empresaId AND ativo = TRUE
    `,
      { empresaId },
    );
    return Number(row?.total ?? 0);
  }

  async touchUltimoLogin(idUser: string, quando: string): Promise<void> {
    await this.db.query(
      `
      UPDATE ${this.db.table('dim_usuario')}
      SET ultimo_login = @quando
      WHERE id_user = @idUser
    `,
      { idUser, quando },
    );
  }

  async listAll(): Promise<UsuarioAuthRow[]> {
    const rows = await this.db.query<RawUsuario>(`
      SELECT ${CAMPOS}
      FROM ${this.tabela}
      ORDER BY nome_completo
    `);
    return rows.map((r) => this.toRow(r));
  }

  async listByEmpresa(empresaId: string): Promise<UsuarioAuthRow[]> {
    const rows = await this.db.query<RawUsuario>(
      `
      SELECT ${CAMPOS}
      FROM ${this.tabela}
      WHERE id_empresa = @empresaId
      ORDER BY
        CASE WHEN ativo THEN 0 ELSE 1 END,
        nome_completo
    `,
      { empresaId },
    );
    return rows.map((r) => this.toRow(r));
  }

  async countActiveByCargo(
    empresaId: string,
    cargo: UsuarioAuthRow['cargo'],
  ): Promise<number> {
    const [{ total }] = await this.db.query<{ total: number }>(
      `
      SELECT COUNT(*) AS total
      FROM ${this.tabela}
      WHERE id_empresa = @empresaId
        AND cargo = @cargo
        AND ativo = TRUE
    `,
      { empresaId, cargo },
    );
    return Number(total);
  }

  async findByEmail(email: string): Promise<UsuarioAuthRow | null> {
    const [row] = await this.db.query<RawUsuario>(
      `
      SELECT ${CAMPOS}
      FROM ${this.tabela}
      WHERE LOWER(email) = LOWER(@email) AND ativo = TRUE
      LIMIT 1
    `,
      { email },
    );
    return row ? this.toRow(row) : null;
  }

  /** Inclui inativos — útil para checar conflito de e-mail no cadastro. */
  async findByEmailAny(email: string): Promise<UsuarioAuthRow | null> {
    const [row] = await this.db.query<RawUsuario>(
      `
      SELECT ${CAMPOS}
      FROM ${this.tabela}
      WHERE LOWER(email) = LOWER(@email)
      LIMIT 1
    `,
      { email },
    );
    return row ? this.toRow(row) : null;
  }

  async findById(idUser: string): Promise<UsuarioAuthRow | null> {
    const [row] = await this.db.query<RawUsuario>(
      `
      SELECT ${CAMPOS}
      FROM ${this.tabela}
      WHERE id_user = @idUser AND ativo = TRUE
      LIMIT 1
    `,
      { idUser },
    );
    return row ? this.toRow(row) : null;
  }

  async findByIdAny(idUser: string): Promise<UsuarioAuthRow | null> {
    const [row] = await this.db.query<RawUsuario>(
      `
      SELECT ${CAMPOS}
      FROM ${this.tabela}
      WHERE id_user = @idUser
      LIMIT 1
    `,
      { idUser },
    );
    return row ? this.toRow(row) : null;
  }

  async createUsuario(input: {
    idUser: string;
    empresaId: string;
    email: string;
    senhaHash: string;
    nomeCompleto: string;
    cargo: UsuarioAuthRow['cargo'];
    dataNascimento?: string | null;
    /** Default TRUE: senha temporária exige troca no 1º acesso. */
    deveTrocarSenha?: boolean;
  }): Promise<UsuarioAuthRow> {
    const agora = new Date().toISOString();
    const row: UsuarioAuthRow = {
      id_user: input.idUser,
      id_empresa: input.empresaId,
      email: input.email,
      senha_hash: input.senhaHash,
      nome_completo: input.nomeCompleto,
      cargo: input.cargo,
      data_nascimento: input.dataNascimento ?? null,
      ativo: true,
      deve_trocar_senha: input.deveTrocarSenha ?? true,
      criado_em: agora,
      alterado_em: null,
    };

    await this.db.transaction(async (tx) => {
      await this.ensureEmpresa(tx, row.id_empresa);
      await this.upsertUsuario(tx, row);
      await this.syncDimUsuario(tx, row);
    });

    return row;
  }

  async setAtivo(idUser: string, ativo: boolean): Promise<UsuarioAuthRow> {
    return this.db.transaction(async (tx) => {
      const [atualizado] = await tx.query<RawUsuario>(
        `
        UPDATE ${this.tabela}
        SET ativo = @ativo,
            alterado_em = now()
        WHERE id_user = @idUser
        RETURNING ${CAMPOS}
      `,
        { idUser, ativo },
      );

      if (!atualizado) {
        throw new Error('Usuário não encontrado');
      }

      const row = this.toRow(atualizado);
      await this.syncDimUsuario(tx, row);
      return row;
    });
  }

  async saveAll(rows: UsuarioAuthRow[]): Promise<void> {
    if (!rows.length) return;
    await this.db.transaction(async (tx) => {
      for (const row of rows) {
        await this.upsertUsuario(tx, row);
        await this.syncDimUsuario(tx, row);
      }
    });
  }

  async updateUser(
    idUser: string,
    patch: Partial<
      Pick<
        UsuarioAuthRow,
        | 'email'
        | 'senha_hash'
        | 'nome_completo'
        | 'alterado_em'
        | 'deve_trocar_senha'
      >
    >,
  ): Promise<UsuarioAuthRow> {
    return this.db.transaction(async (tx) => {
      const trocouSenha = patch.senha_hash != null;
      const [atualizado] = await tx.query<RawUsuario>(
        `
        UPDATE ${this.tabela}
        SET email = COALESCE(@email, email),
            senha_hash = COALESCE(@senhaHash, senha_hash),
            nome_completo = COALESCE(@nomeCompleto, nome_completo),
            deve_trocar_senha = CASE
              WHEN @trocouSenha THEN FALSE
              WHEN @deveTrocarSenha::boolean IS NOT NULL THEN @deveTrocarSenha
              ELSE deve_trocar_senha
            END,
            alterado_em = now()
        WHERE id_user = @idUser
        RETURNING ${CAMPOS}
      `,
        {
          idUser,
          email: patch.email ?? null,
          senhaHash: patch.senha_hash ?? null,
          nomeCompleto: patch.nome_completo ?? null,
          trocouSenha,
          deveTrocarSenha:
            patch.deve_trocar_senha === undefined
              ? null
              : patch.deve_trocar_senha,
        },
      );

      if (!atualizado) {
        throw new Error('Usuário não encontrado');
      }

      const row = this.toRow(atualizado);
      await this.syncDimUsuario(tx, row);
      return row;
    });
  }

  private async ensureSeeded() {
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });
    const [{ total }] = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM ${this.tabela}`,
    );

    if (Number(total) > 0) {
      this.logger.log(`ctl_usuario: ${total} usuário(s) carregados`);
      return;
    }

    // Produção: nunca cria usuários automaticamente.
    if (!allowAuthDemoSeed({ NODE_ENV: nodeEnv })) {
      this.logger.error(
        'ctl_usuario está vazia em produção — cadastre usuários manualmente antes do go-live. Seed demo está desabilitado.',
      );
      return;
    }

    const demo = this.config.get('AUTH_DEMO_USERS', { infer: true });
    if (!demo.length) {
      this.logger.warn(
        'ctl_usuario: vazia e sem AUTH_DEMO_USERS (apenas development/test)',
      );
      return;
    }

    const agora = new Date().toISOString();
    const rows: UsuarioAuthRow[] = demo.map((u) => ({
      id_user: u.idUser ?? `user-${u.email.split('@')[0]}`,
      id_empresa: u.empresaId,
      email: u.email,
      senha_hash: hashPassword(u.password),
      nome_completo: u.nome,
      cargo: u.cargo,
      data_nascimento: u.dataNascimento ?? null,
      ativo: true,
      deve_trocar_senha: false,
      criado_em: agora,
      alterado_em: null,
    }));

    await this.db.transaction(async (tx) => {
      for (const empresaId of new Set(rows.map((r) => r.id_empresa))) {
        await this.ensureEmpresa(tx, empresaId);
      }
      for (const row of rows) {
        await this.upsertUsuario(tx, row);
        await this.syncDimUsuario(tx, row);
      }
    });

    this.logger.warn(
      `ctl_usuario: seed LOCAL de ${rows.length} usuário(s) demo (não usar em produção)`,
    );
  }

  /**
   * Garante operador PLATFORM em development (ops@glazia.com.br).
   * Em produção o dono deve ser criado manualmente / via seed controlado.
   */
  private async ensurePlatformOperator() {
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });
    if (!allowAuthDemoSeed({ NODE_ENV: nodeEnv })) return;

    const [existing] = await this.db.query<{ id_user: string }>(
      `
      SELECT id_user FROM ${this.tabela}
      WHERE cargo = 'PLATFORM' AND ativo = TRUE
      LIMIT 1
    `,
    );
    if (existing) return;

    const platformId = 'glazia-platform';
    await this.db.transaction(async (tx) => {
      await tx.query(
        `
        INSERT INTO ${this.db.table('dim_empresa')}
          (id_empresa, nome_fantasia, plano_assinatura, data_onboarding,
           status_assinatura, contato_nome, contato_email)
        VALUES
          (@id, 'Glazia Platform', 'PRO', CURRENT_DATE,
           'ativa', 'Operações Glazia', 'ops@glazia.com.br')
        ON CONFLICT (id_empresa) DO NOTHING
      `,
        { id: platformId },
      );

      const row: UsuarioAuthRow = {
        id_user: 'user-platform-ops',
        id_empresa: platformId,
        email: 'ops@glazia.com.br',
        senha_hash: hashPassword('demo1234'),
        nome_completo: 'Ops Glazia',
        cargo: 'PLATFORM',
        data_nascimento: null,
        ativo: true,
        deve_trocar_senha: false,
        criado_em: new Date().toISOString(),
        alterado_em: null,
      };
      await this.upsertUsuario(tx, row);
      await this.syncDimUsuario(tx, row);
    });

    this.logger.warn(
      'ctl_usuario: seed LOCAL do operador PLATFORM ops@glazia.com.br (só development)',
    );
  }

  /** O tenant é a raiz de todas as FKs; sem ele nada mais pode existir. */
  private async ensureEmpresa(tx: Queryable, empresaId: string) {
    await tx.query(
      `
      INSERT INTO ${this.db.table('dim_empresa')} (id_empresa, nome_fantasia, data_onboarding)
      VALUES (@empresaId, @nome, CURRENT_DATE)
      ON CONFLICT (id_empresa) DO NOTHING
    `,
      { empresaId, nome: 'Glazia' },
    );
  }

  private async upsertUsuario(tx: Queryable, user: UsuarioAuthRow) {
    await tx.query(
      `
      INSERT INTO ${this.tabela}
        (id_user, id_empresa, email, senha_hash, nome_completo, cargo,
         data_nascimento, ativo, deve_trocar_senha, criado_em, alterado_em)
      VALUES
        (@idUser, @idEmpresa, @email, @senhaHash, @nomeCompleto, @cargo,
         @dataNascimento, @ativo, @deveTrocarSenha, @criadoEm, @alteradoEm)
      ON CONFLICT (id_user) DO UPDATE SET
        email = EXCLUDED.email,
        senha_hash = EXCLUDED.senha_hash,
        nome_completo = EXCLUDED.nome_completo,
        cargo = EXCLUDED.cargo,
        data_nascimento = EXCLUDED.data_nascimento,
        ativo = EXCLUDED.ativo,
        deve_trocar_senha = EXCLUDED.deve_trocar_senha,
        alterado_em = now()
    `,
      {
        idUser: user.id_user,
        idEmpresa: user.id_empresa,
        email: user.email,
        senhaHash: user.senha_hash,
        nomeCompleto: user.nome_completo,
        cargo: user.cargo,
        dataNascimento: user.data_nascimento,
        ativo: user.ativo,
        deveTrocarSenha: user.deve_trocar_senha,
        criadoEm: user.criado_em,
        alteradoEm: user.alterado_em,
      },
    );
  }

  /** dim_usuario é a face analítica do login e nunca recebe a senha. */
  private async syncDimUsuario(tx: Queryable, user: UsuarioAuthRow) {
    await tx.query(
      `
      INSERT INTO ${this.db.table('dim_usuario')}
        (id_user, id_empresa, cargo, nome_completo, email, data_nascimento, ativo)
      VALUES
        (@idUser, @idEmpresa, @cargo, @nomeCompleto, @email, @dataNascimento, @ativo)
      ON CONFLICT (id_user) DO UPDATE SET
        id_empresa = EXCLUDED.id_empresa,
        cargo = EXCLUDED.cargo,
        nome_completo = EXCLUDED.nome_completo,
        email = EXCLUDED.email,
        data_nascimento = EXCLUDED.data_nascimento,
        ativo = EXCLUDED.ativo
    `,
      {
        idUser: user.id_user,
        idEmpresa: user.id_empresa,
        cargo: user.cargo,
        nomeCompleto: user.nome_completo,
        email: user.email,
        dataNascimento: user.data_nascimento,
        ativo: user.ativo,
      },
    );
  }

  private toRow(raw: RawUsuario): UsuarioAuthRow {
    return {
      ...raw,
      ativo: Boolean(raw.ativo),
      deve_trocar_senha: Boolean(raw.deve_trocar_senha),
      criado_em: this.asIso(raw.criado_em) ?? new Date().toISOString(),
      alterado_em: this.asIso(raw.alterado_em),
    };
  }

  private asIso(value: Date | string | null): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
  }
}
