import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { GlaziaSupabaseClient } from '../supabase/supabase.service';

@Injectable()
export class CatalogosService {
  async listar(client: GlaziaSupabaseClient, empresaId: string) {
    const [clientes, fornecedores, produtos, projetos, planoContas] =
      await Promise.all([
        client
          .from('clientes')
          .select('id,nome')
          .eq('id_empresa', empresaId)
          .order('nome'),
        client
          .from('fornecedores')
          .select('id,nome_fornecedor')
          .eq('id_empresa', empresaId)
          .order('nome_fornecedor'),
        client
          .from('produtos')
          .select('id,nome_produto,linha_produto,tipo_item')
          .or(`id_empresa.eq.${empresaId},id_empresa.is.null`)
          .order('nome_produto'),
        client
          .from('projetos')
          .select('id,nome_obra,status,id_cliente')
          .eq('id_empresa', empresaId)
          .order('nome_obra'),
        client
          .from('plano_contas')
          .select('id,tipo_conta,categoria,subcategoria')
          .or(`id_empresa.eq.${empresaId},id_empresa.is.null`)
          .order('categoria'),
      ]);

    const firstError = [
      clientes.error,
      fornecedores.error,
      produtos.error,
      projetos.error,
      planoContas.error,
    ].find(Boolean);

    if (firstError) {
      throw new InternalServerErrorException(
        'Não foi possível carregar os catálogos',
      );
    }

    return {
      clientes: clientes.data ?? [],
      fornecedores: fornecedores.data ?? [],
      produtos: produtos.data ?? [],
      projetos: projetos.data ?? [],
      planoContas: planoContas.data ?? [],
    };
  }
}
