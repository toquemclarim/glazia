import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  entitlementsFor,
  podeAdicionarUsuario,
} from '../billing/plan.entitlements';
import type { AuthContext } from './auth-context';
import type { CriarUsuarioEquipeDto } from './dto/equipe.dto';
import { hashPassword } from './password.util';
import { UsuariosStore, type UsuarioAuthRow } from './usuarios.store';

export type UsuarioEquipePublico = {
  idUser: string;
  email: string;
  nomeCompleto: string;
  cargo: UsuarioAuthRow['cargo'];
  dataNascimento: string | null;
  ativo: boolean;
  criadoEm: string;
  alteradoEm: string | null;
};

@Injectable()
export class EquipeService {
  constructor(private readonly usuariosStore: UsuariosStore) {}

  async listar(auth: AuthContext): Promise<UsuarioEquipePublico[]> {
    const rows = await this.usuariosStore.listByEmpresa(auth.empresaId);
    return rows.map((row) => this.toPublico(row));
  }

  async criar(
    auth: AuthContext,
    dto: CriarUsuarioEquipeDto,
  ): Promise<{
    usuario: UsuarioEquipePublico;
    senhaTemporaria: string;
  }> {
    await this.assertLimiteUsuarios(auth.empresaId);

    const email = dto.email.trim().toLowerCase();
    const conflito = await this.usuariosStore.findByEmailAny(email);
    if (conflito) {
      throw new BadRequestException('Este e-mail já está em uso');
    }

    const senhaTemporaria = dto.senhaTemporaria;
    const row = await this.usuariosStore.createUsuario({
      idUser: `user-${randomUUID()}`,
      empresaId: auth.empresaId,
      email,
      senhaHash: hashPassword(senhaTemporaria),
      nomeCompleto: dto.nomeCompleto.trim(),
      cargo: dto.cargo,
      dataNascimento: dto.dataNascimento ?? null,
    });

    return {
      usuario: this.toPublico(row),
      senhaTemporaria,
    };
  }

  async alterarAtivo(
    auth: AuthContext,
    idUser: string,
    ativo: boolean,
  ): Promise<UsuarioEquipePublico> {
    if (idUser === auth.userId && !ativo) {
      throw new BadRequestException('Você não pode desativar a própria conta');
    }

    const target = await this.usuariosStore.findByIdAny(idUser);
    if (!target || target.id_empresa !== auth.empresaId) {
      throw new NotFoundException('Usuário não encontrado nesta empresa');
    }

    if (!ativo && target.cargo === 'DIRETOR' && target.ativo) {
      const ativos = await this.usuariosStore.countActiveByCargo(
        auth.empresaId,
        'DIRETOR',
      );
      if (ativos <= 1) {
        throw new BadRequestException(
          'Não é possível desativar o único Diretor ativo da empresa',
        );
      }
    }

    if (target.ativo === ativo) {
      return this.toPublico(target);
    }

    // Defesa: nunca alterar usuário de outro tenant (já filtrado acima).
    if (target.id_empresa !== auth.empresaId) {
      throw new ForbiddenException('Usuário fora da sua empresa');
    }

    if (ativo && !target.ativo) {
      await this.assertLimiteUsuarios(auth.empresaId);
    }

    const updated = await this.usuariosStore.setAtivo(idUser, ativo);
    return this.toPublico(updated);
  }

  private async assertLimiteUsuarios(empresaId: string) {
    const plano = await this.usuariosStore.getEmpresaPlano(empresaId);
    const ativos =
      await this.usuariosStore.countActiveByEmpresa(empresaId);
    if (!podeAdicionarUsuario(plano, ativos)) {
      const { label, maxUsuarios } = entitlementsFor(plano);
      throw new ForbiddenException(
        `Plano ${label} permite no máximo ${maxUsuarios} usuário(s) ativo(s). Faça upgrade para adicionar mais.`,
      );
    }
  }

  private toPublico(row: UsuarioAuthRow): UsuarioEquipePublico {
    return {
      idUser: row.id_user,
      email: row.email,
      nomeCompleto: row.nome_completo,
      cargo: row.cargo,
      dataNascimento: row.data_nascimento,
      ativo: row.ativo,
      criadoEm: row.criado_em,
      alteradoEm: row.alterado_em,
    };
  }
}
