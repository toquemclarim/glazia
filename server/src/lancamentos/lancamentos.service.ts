import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { GlaziaSupabaseClient } from '../supabase/supabase.service';
import {
  CreateLancamentoDto,
  StatusLancamento,
} from './dto/create-lancamento.dto';
import type { ListLancamentosDto } from './dto/list-lancamentos.dto';

const LANCAMENTO_SELECT = [
  'id',
  'tipo',
  'id_cliente',
  'id_fornecedor',
  'id_projeto',
  'id_produto',
  'id_plano_contas',
  'descricao',
  'valor',
  'data_lancamento',
  'status',
  'criado_em',
  'clientes(nome)',
  'fornecedores(nome_fornecedor)',
  'projetos(nome_obra)',
  'produtos(nome_produto,linha_produto,tipo_item)',
  'plano_contas(tipo_conta,categoria,subcategoria)',
].join(',');

@Injectable()
export class LancamentosService {
  async listar(
    client: GlaziaSupabaseClient,
    empresaId: string,
    filtros: ListLancamentosDto,
  ) {
    let query = client
      .from('lancamentos_financeiros')
      .select(LANCAMENTO_SELECT)
      .eq('id_empresa', empresaId)
      .order('data_lancamento', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(filtros.limite);

    if (filtros.mes) {
      const inicio = `${filtros.mes}-01`;
      const [ano, mes] = filtros.mes.split('-').map(Number);
      const proximoMes = new Date(Date.UTC(ano, mes, 1))
        .toISOString()
        .slice(0, 10);
      query = query
        .gte('data_lancamento', inicio)
        .lt('data_lancamento', proximoMes);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        'Não foi possível consultar os lançamentos',
      );
    }

    return data ?? [];
  }

  async criar(
    client: GlaziaSupabaseClient,
    empresaId: string,
    dto: CreateLancamentoDto,
  ) {
    const idCliente = await this.resolverCliente(
      client,
      empresaId,
      dto.idCliente,
      dto.clienteNome,
    );
    const payload = {
      id_empresa: empresaId,
      tipo: dto.tipo,
      id_cliente: idCliente,
      id_fornecedor: dto.idFornecedor ?? null,
      id_projeto: dto.idProjeto ?? null,
      id_produto: dto.idProduto ?? null,
      id_plano_contas: dto.idPlanoContas ?? null,
      descricao: dto.descricao.trim(),
      valor: dto.valor,
      data_lancamento: dto.dataLancamento,
      status: dto.status ?? StatusLancamento.REALIZADO,
    };

    const { data, error } = await client
      .from('lancamentos_financeiros')
      .insert(payload)
      .select(LANCAMENTO_SELECT)
      .single();

    if (error) {
      if (error.code === '23514' || error.code === '23503') {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Não foi possível registrar o lançamento',
      );
    }

    return data;
  }

  private async resolverCliente(
    client: GlaziaSupabaseClient,
    empresaId: string,
    idCliente?: string,
    clienteNome?: string,
  ): Promise<string | null> {
    if (idCliente) {
      return idCliente;
    }

    const nome = clienteNome?.trim();
    if (!nome) {
      return null;
    }

    const { data: existente, error: buscaError } = await client
      .from('clientes')
      .select('id')
      .eq('id_empresa', empresaId)
      .ilike('nome', nome)
      .limit(1)
      .maybeSingle();

    if (buscaError) {
      throw new InternalServerErrorException(
        'Não foi possível localizar o cliente',
      );
    }

    if (existente?.id) {
      return existente.id as string;
    }

    const { data: criado, error: criacaoError } = await client
      .from('clientes')
      .insert({ id_empresa: empresaId, nome })
      .select('id')
      .single();

    if (criacaoError) {
      throw new BadRequestException('Não foi possível cadastrar o cliente');
    }

    return criado.id as string;
  }

  async remover(
    client: GlaziaSupabaseClient,
    empresaId: string,
    lancamentoId: string,
  ) {
    const { data, error } = await client
      .from('lancamentos_financeiros')
      .delete()
      .eq('id_empresa', empresaId)
      .eq('id', lancamentoId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Não foi possível excluir o lançamento',
      );
    }

    if (!data) {
      throw new NotFoundException('Lançamento não encontrado');
    }
  }
}
