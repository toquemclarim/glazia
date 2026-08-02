import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  diasRestantesTrial,
  empresaBloqueada,
  empresaOperacional,
  trialFimFrom,
  TRIAL_DIAS,
} from '../billing/subscription';
import { DatabaseService } from '../database/database.service';
import { DespesasFixasService } from '../despesas-fixas/despesas-fixas.service';
import type { AuthContext, JwtPayload } from './auth-context';
import type { SignupDto } from './dto/signup.dto';
import { hashPassword, verifyPassword } from './password.util';
import { UsuariosStore, type UsuarioAuthRow } from './usuarios.store';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly lastLogins = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usuariosStore: UsuariosStore,
    private readonly db: DatabaseService,
    private readonly despesasFixas: DespesasFixasService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usuariosStore.findByEmail(email);
    if (!user || !verifyPassword(password, user.senha_hash)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.refreshEmpresaStatus(user);
    await this.assertPodeAutenticar(user);

    const ultimoLogin = new Date().toISOString();
    this.lastLogins.set(user.id_user, ultimoLogin);
    void this.usuariosStore.touchUltimoLogin(user.id_user, ultimoLogin);

    return this.issueTokenForUser(user, ultimoLogin);
  }

  /**
   * Autocadastro público: empresa em Trial (14 dias) + diretor DIRETOR.
   * Autentica automaticamente; senha temporária força /primeiro-acesso.
   */
  async signup(dto: SignupDto) {
    if (dto.senha !== dto.confirmarSenha) {
      throw new BadRequestException('As senhas não coincidem');
    }
    if (!dto.aceitouTermos) {
      throw new BadRequestException('É necessário aceitar os Termos de Uso');
    }

    const emailLogin = dto.emailLogin.trim().toLowerCase();
    const emailContato = dto.emailContato.trim().toLowerCase();
    const telefone = dto.telefone.replace(/\D/g, '');

    if (telefone.length < 10 || telefone.length > 11) {
      throw new BadRequestException('Telefone inválido');
    }

    const conflito = await this.usuariosStore.findByEmailAny(emailLogin);
    if (conflito) {
      throw new BadRequestException('Este e-mail de login já está em uso');
    }

    const empresaId = await this.criarIdEmpresa(dto.nomeFantasia);
    const inicio = new Date();
    const fim = trialFimFrom(inicio);

    await this.db.query(
      `
      INSERT INTO ${this.db.table('dim_empresa')} (
        id_empresa, nome_fantasia, razao_social, cnpj, plano_assinatura,
        data_onboarding, status_assinatura, contato_nome, contato_email,
        contato_telefone, trial_inicio, trial_fim, criado_em, alterado_em
      ) VALUES (
        @idEmpresa, @nome, @razao, @cnpj, 'TRIAL',
        CURRENT_DATE, 'trial', @contatoNome, @contatoEmail,
        @telefone, @trialInicio, @trialFim, now(), NULL
      )
    `,
      {
        idEmpresa: empresaId,
        nome: dto.nomeFantasia.trim(),
        razao: dto.razaoSocial?.trim() || null,
        cnpj: dto.cnpj?.replace(/\D/g, '') || null,
        contatoNome: dto.nomeDiretor.trim(),
        contatoEmail: emailContato,
        telefone,
        trialInicio: inicio.toISOString(),
        trialFim: fim.toISOString(),
      },
    );

    const diretor = await this.usuariosStore.createUsuario({
      idUser: `user-${randomUUID()}`,
      empresaId,
      email: emailLogin,
      senhaHash: hashPassword(dto.senha),
      nomeCompleto: dto.nomeDiretor.trim(),
      cargo: 'DIRETOR',
      deveTrocarSenha: true,
    });

    try {
      const authDiretor: AuthContext = {
        userId: diretor.id_user,
        email: diretor.email,
        empresaId,
        nomeCompleto: diretor.nome_completo,
        cargo: 'DIRETOR',
        dataNascimento: null,
      };
      await this.despesasFixas.seedTemplateVidracaria(authDiretor);
    } catch (error) {
      this.logger.warn(
        `Seed custos trial falhou (${empresaId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    this.logger.log(
      `Signup trial: ${empresaId} · ${emailLogin} · ${TRIAL_DIAS} dias`,
    );

    return this.issueTokenForUser(diretor);
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
  }

  async resolveAuthFromToken(token: string): Promise<AuthContext> {
    const payload = this.verifyToken(token);
    const user = await this.usuariosStore.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Sessão inválida ou usuário inativo');
    }

    await this.refreshEmpresaStatus(user);
    await this.assertPodeAutenticar(user);

    if (this.isTokenStale(payload, user.alterado_em)) {
      throw new UnauthorizedException(
        'Sessão invalidada. Entre novamente com as novas credenciais.',
      );
    }

    return this.toAuthContext(user);
  }

  /** Bloqueia rotas de negócio quando a empresa não está operacional. */
  async assertEmpresaOperacional(auth: AuthContext) {
    if (auth.cargo === 'PLATFORM') return;
    const status = await this.usuariosStore.expireTrialIfNeeded(auth.empresaId);
    if (!empresaOperacional(status)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMPRESA_INATIVA',
        message:
          'O período de avaliação encerrou ou a empresa está inativa. Fale conosco pelo WhatsApp para ativar.',
      });
    }
  }

  async me(auth: AuthContext) {
    const user = await this.usuariosStore.findById(auth.userId);
    if (!user) {
      throw new UnauthorizedException('Sessão inválida ou usuário inativo');
    }
    await this.refreshEmpresaStatus(user);
    return this.issueTokenForUser(
      user,
      this.lastLogins.get(auth.userId) ?? null,
    ).then((s) => s.usuario);
  }

  async issueTokenForUser(user: UsuarioAuthRow, ultimoLogin?: string | null) {
    const payload = this.toPayload(user);
    const accessToken = await this.jwtService.signAsync(payload);
    const assinatura = await this.usuariosStore.getEmpresaAssinatura(
      user.id_empresa,
    );
    const plano = assinatura?.planoAssinatura ?? 'BASIC';
    return {
      accessToken,
      usuario: this.toUsuario(
        payload,
        ultimoLogin ?? this.lastLogins.get(user.id_user) ?? null,
        plano,
        user.deve_trocar_senha,
        assinatura,
      ),
    };
  }

  async changePassword(userId: string, senhaAtual: string, senhaNova: string) {
    const user = await this.usuariosStore.findById(userId);
    if (!user || !verifyPassword(senhaAtual, user.senha_hash)) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const updated = await this.usuariosStore.updateUser(userId, {
      senha_hash: hashPassword(senhaNova),
    });

    const session = await this.issueTokenForUser(updated);
    return {
      ...session,
      mensagem: 'Senha alterada com sucesso',
    };
  }

  async changeEmail(userId: string, novoEmail: string, senhaAtual: string) {
    const user = await this.usuariosStore.findById(userId);
    if (!user || !verifyPassword(senhaAtual, user.senha_hash)) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const email = novoEmail.trim().toLowerCase();
    const conflito = await this.usuariosStore.findByEmail(email);
    if (conflito && conflito.id_user !== userId) {
      throw new BadRequestException('Este e-mail já está em uso');
    }

    const updated = await this.usuariosStore.updateUser(userId, { email });
    return this.issueTokenForUser(updated);
  }

  private async refreshEmpresaStatus(user: UsuarioAuthRow) {
    if (user.cargo === 'PLATFORM') return;
    await this.usuariosStore.expireTrialIfNeeded(user.id_empresa);
  }

  /** Login/sessão: suspensa/cancelada bloqueiam; inativa autentica (modal no FE). */
  private async assertPodeAutenticar(user: UsuarioAuthRow) {
    if (user.cargo === 'PLATFORM') return;
    const status = await this.usuariosStore.getEmpresaStatus(user.id_empresa);
    if (status === 'suspensa' || status === 'cancelada') {
      throw new UnauthorizedException(
        'Acesso suspenso para esta empresa. Fale com o suporte Glazia.',
      );
    }
  }

  private async criarIdEmpresa(nome: string) {
    const base = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const slug = base ? `empresa-${base}` : `empresa-${randomUUID().slice(0, 8)}`;
    const existente = await this.db.query<{ id_empresa: string }>(
      `SELECT id_empresa FROM ${this.db.table('dim_empresa')} WHERE id_empresa = @id LIMIT 1`,
      { id: slug },
    );
    return existente.length > 0 ? `${slug}-${randomUUID().slice(0, 8)}` : slug;
  }

  private isTokenStale(
    payload: JwtPayload,
    alteradoEm: string | null,
  ): boolean {
    if (!alteradoEm || payload.iat == null) return false;
    const alteradoMs = new Date(alteradoEm).getTime();
    if (Number.isNaN(alteradoMs)) return false;
    return payload.iat * 1000 + 5000 < alteradoMs;
  }

  private toAuthContext(user: UsuarioAuthRow): AuthContext {
    return {
      userId: user.id_user,
      email: user.email,
      empresaId: user.id_empresa,
      nomeCompleto: user.nome_completo,
      cargo: user.cargo,
      dataNascimento: user.data_nascimento,
    };
  }

  private toPayload(user: UsuarioAuthRow): JwtPayload {
    return {
      sub: user.id_user,
      email: user.email,
      empresaId: user.id_empresa,
      nome: user.nome_completo,
      cargo: user.cargo,
      dataNascimento: user.data_nascimento,
    };
  }

  private toUsuario(
    payload: JwtPayload,
    ultimoLogin: string | null,
    plano: string | null,
    deveTrocarSenha = false,
    assinatura?: {
      statusAssinatura: string;
      trialInicio: string | null;
      trialFim: string | null;
      nomeFantasia: string;
    } | null,
  ) {
    const status = assinatura?.statusAssinatura ?? 'ativa';
    const trialFim = assinatura?.trialFim ?? null;
    return {
      id: payload.sub,
      idUser: payload.sub,
      email: payload.email,
      nome: payload.nome,
      nomeCompleto: payload.nome,
      empresaId: payload.empresaId,
      cargo: payload.cargo,
      dataNascimento: payload.dataNascimento ?? null,
      ultimoLogin,
      plano: plano ?? 'BASIC',
      deveTrocarSenha:
        payload.cargo === 'PLATFORM' ? false : Boolean(deveTrocarSenha),
      statusAssinatura: status,
      empresaNome: assinatura?.nomeFantasia ?? null,
      trialInicio: assinatura?.trialInicio ?? null,
      trialFim,
      trialDiasRestantes:
        status === 'trial' ? diasRestantesTrial(trialFim) : null,
      empresaBloqueada: empresaBloqueada(status),
    };
  }
}
