import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthContext } from '../auth/auth-context';
import { assertOperador } from '../auth/roles';
import { DatabaseService, type Queryable } from '../database/database.service';
import type {
  AtualizarVendaDto,
  CriarCustoDto,
  CriarVendaDto,
  GastoItemDto,
  ItemVendaDto,
  ListarVendasQueryDto,
} from './dto/lancamentos.dto';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function catalogProductId(idProdutoCatalogo: number): string {
  return `ctl_${idProdutoCatalogo}`;
}

/** Insumo do catálogo consumido fora de uma venda (estoque ou custo avulso). */
function catalogCostProductId(idCustoCatalogo: number): string {
  return `custo_cat_${idCustoCatalogo}`;
}

function parseCtlProductId(idProduto: string | null): number {
  if (!idProduto?.startsWith('ctl_')) return 0;
  const n = Number(idProduto.slice(4));
  return Number.isFinite(n) ? n : 0;
}

function parseCatCustoId(observacao: string | null): number | null {
  if (!observacao) return null;
  const m = observacao.match(/cat_custo:(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function likeContains(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

@Injectable()
export class LancamentosService {
  constructor(private readonly db: DatabaseService) {}

  private assertOperador(auth: AuthContext) {
    assertOperador(auth);
  }

  async listarVendas(auth: AuthContext, query: ListarVendasQueryDto) {
    this.assertOperador(auth);
    const vendas = this.db.table('fato_venda');
    const itens = this.db.table('fato_venda_item');
    const produtos = this.db.table('dim_produto');
    const clientes = this.db.table('dim_cliente');
    const params: Record<string, unknown> = { empresaId: auth.empresaId };
    const search = query.q?.trim();

    let searchSql = '';
    if (search) {
      params.q = likeContains(search);
      searchSql = `
        AND (
          COALESCE(v.observacao, '') ILIKE @q
          OR COALESCE(c.nome, '') ILIKE @q
          OR EXISTS (
            SELECT 1
            FROM ${itens} i
            LEFT JOIN ${produtos} p
              ON p.id_produto = i.id_produto AND p.id_empresa = i.id_empresa
            WHERE i.id_venda = v.id_venda
              AND i.id_empresa = v.id_empresa
              AND (
                COALESCE(i.linha_produto, '') ILIKE @q
                OR COALESCE(p.nome_produto, '') ILIKE @q
              )
          )
        )
      `;
    }

    const rows = await this.db.query<{
      id_venda: string;
      data_venda: string;
      valor_total_informado: number;
      status_venda: string | null;
      observacao: string | null;
      cliente: string | null;
      qtd_itens: number;
      resumo_itens: string | null;
    }>(
      `
      SELECT
        v.id_venda,
        v.data_venda,
        v.valor_total_informado,
        v.status_venda,
        v.observacao,
        c.nome AS cliente,
        (SELECT COUNT(*) FROM ${itens} i WHERE i.id_venda = v.id_venda AND i.id_empresa = v.id_empresa) AS qtd_itens,
        (
          SELECT STRING_AGG(txt, ', ' ORDER BY txt)
          FROM (
            SELECT DISTINCT COALESCE(
              NULLIF(TRIM(p.nome_produto), ''),
              NULLIF(TRIM(i.linha_produto), ''),
              'Item'
            ) AS txt
            FROM ${itens} i
            LEFT JOIN ${produtos} p
              ON p.id_produto = i.id_produto AND p.id_empresa = i.id_empresa
            WHERE i.id_venda = v.id_venda AND i.id_empresa = v.id_empresa
          ) s
        ) AS resumo_itens
      FROM ${vendas} v
      LEFT JOIN ${clientes} c
        ON c.id_cliente = v.id_cliente AND c.id_empresa = v.id_empresa
      WHERE v.id_empresa = @empresaId
        AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
        ${searchSql}
      ORDER BY v.data_venda DESC, v.criado_em DESC
      LIMIT 80
    `,
      params,
    );

    return {
      itens: rows.map((r) => {
        const dataVenda = this.asDateString(r.data_venda);
        const valorTotal = Number(r.valor_total_informado ?? 0);
        const resumo = r.resumo_itens;
        const cliente = r.cliente?.trim() || null;
        const partes = [
          dataVenda.split('-').reverse().join('/'),
          `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          cliente,
          resumo,
        ].filter(Boolean);
        return {
          idVenda: r.id_venda,
          dataVenda,
          valorTotal,
          status: r.status_venda ?? 'FECHADA',
          observacao: r.observacao,
          qtdItens: Number(r.qtd_itens ?? 0),
          resumo,
          cliente,
          rotulo: partes.join(' · '),
        };
      }),
    };
  }

  async criarVenda(auth: AuthContext, dto: CriarVendaDto) {
    this.assertOperador(auth);

    const idVenda = `vnd_${randomUUID().replace(/-/g, '')}`;
    const dataVenda = dto.dataVenda ?? todayIsoDate();
    const agora = new Date().toISOString();
    const valorTotal = dto.itens.reduce(
      (acc, item) => acc + item.quantidade * item.valorUnitario,
      0,
    );

    const [cliente] = await this.db.query<{ id_cliente: string; nome: string }>(
      `
      SELECT id_cliente, nome
      FROM ${this.db.table('dim_cliente')}
      WHERE id_cliente = @idCliente
        AND id_empresa = @empresaId
        AND COALESCE(ativo, TRUE) = TRUE
      LIMIT 1
    `,
      { idCliente: dto.idCliente, empresaId: auth.empresaId },
    );
    if (!cliente) {
      throw new BadRequestException(
        'Cliente inválido ou inativo. Cadastre ou selecione um cliente da lista.',
      );
    }

    const dimProdutos = this.buildDimProdutoRows(auth, dto.itens);
    const vendaRow = {
      id_venda: idVenda,
      id_empresa: auth.empresaId,
      id_projeto: null,
      id_cliente: dto.idCliente,
      data_venda: dataVenda,
      status_venda: 'FECHADA',
      valor_total_informado: valorTotal,
      observacao: dto.observacao ?? null,
      origem: 'CRM_LANCAMENTOS',
      criado_em: agora,
      id_usuario_criacao: auth.userId,
      id_usuario_alteracao: null,
      alterado_em: null,
    };

    const itemRows = dto.itens.map((item) => {
      const idVendaItem = `vit_${randomUUID().replace(/-/g, '')}`;
      const total = item.quantidade * item.valorUnitario;
      const gastos = item.gastos ?? [];
      const custoTotal = gastos.reduce((a, g) => a + g.valor, 0);
      return {
        idVendaItem,
        row: {
          id_venda_item: idVendaItem,
          id_venda: idVenda,
          id_empresa: auth.empresaId,
          id_produto: catalogProductId(item.idProdutoCatalogo),
          linha_produto: item.linha,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          valor_total_item: total,
          custo_unitario_estimado:
            item.quantidade > 0 ? custoTotal / item.quantidade : null,
          custo_total_estimado: custoTotal > 0 ? custoTotal : null,
          data_venda: dataVenda,
          id_usuario_criacao: auth.userId,
          criado_em: agora,
          id_usuario_alteracao: null,
          alterado_em: null,
          origem: 'CRM_LANCAMENTOS',
        },
        item,
      };
    });

    const custoRows: Record<string, unknown>[] = [];
    for (const { idVendaItem, item } of itemRows) {
      for (const gasto of item.gastos ?? []) {
        custoRows.push(
          this.buildCustoRow(auth, {
            gasto,
            data: dataVenda,
            agora,
            idVenda,
            idVendaItem,
            linhaProduto: item.linha,
            idProdutoConsumido: catalogProductId(item.idProdutoCatalogo),
            destino: 'ITEM_VENDA',
          }),
        );
      }
    }

    const fluxoRow = {
      id_transacao: `flx_${randomUUID().replace(/-/g, '')}`,
      id_empresa: auth.empresaId,
      tipo_movimentacao: 'ENTRADA',
      id_plano_contas: 'pc_receita_vendas',
      id_projeto: null,
      data_vencimento: dto.dataPrevisaoRecebimento,
      data_pagamento: null,
      valor_previsto: valorTotal,
      valor_realizado: null,
      metodo_pagamento: null,
      status_financeiro: 'PREVISTO',
      data_competencia: dataVenda,
      id_despesa_fixa: null,
      id_venda: idVenda,
      descricao: `Recebimento previsto — ${cliente.nome}`,
      id_usuario_criacao: auth.userId,
      criado_em: agora,
      id_usuario_alteracao: null,
      alterado_em: null,
      origem: 'CRM_LANCAMENTOS',
    };

    // Venda, itens, custos e previsão de recebimento entram ou falham juntos.
    await this.db.transaction(async (tx) => {
      await this.upsertDimProdutos(tx, dimProdutos);
      await this.ensurePlanoContas(
        tx,
        auth.empresaId,
        'pc_receita_vendas',
        'RECEITA',
        'Vendas',
        'Recebimento de vendas',
      );
      await tx.insert(this.db.table('fato_venda'), [vendaRow]);
      await tx.insert(
        this.db.table('fato_venda_item'),
        itemRows.map((x) => x.row),
      );
      if (custoRows.length) {
        await tx.insert(this.db.table('fato_custos_operacionais'), custoRows);
      }
      await tx.insert(this.db.table('fato_fluxo_caixa'), [fluxoRow]);
    });

    return {
      idVenda,
      idCliente: dto.idCliente,
      cliente: cliente.nome,
      dataVenda,
      dataPrevisaoRecebimento: dto.dataPrevisaoRecebimento,
      valorTotal,
      qtdItens: dto.itens.length,
      qtdGastos: custoRows.length,
      mensagem: `Venda lançada para ${cliente.nome}`,
    };
  }

  async obterVenda(auth: AuthContext, idVenda: string) {
    this.assertOperador(auth);
    const vendas = this.db.table('fato_venda');
    const itens = this.db.table('fato_venda_item');
    const custos = this.db.table('fato_custos_operacionais');
    const fluxo = this.db.table('fato_fluxo_caixa');
    const clientes = this.db.table('dim_cliente');
    const catalogo = this.db.catalogTable('ctl_produtos');

    const [venda] = await this.db.query<{
      id_venda: string;
      id_cliente: string | null;
      cliente: string | null;
      data_venda: string;
      status_venda: string | null;
      observacao: string | null;
      valor_total_informado: number;
    }>(
      `
      SELECT
        v.id_venda,
        v.id_cliente,
        c.nome AS cliente,
        v.data_venda,
        v.status_venda,
        v.observacao,
        v.valor_total_informado
      FROM ${vendas} v
      LEFT JOIN ${clientes} c
        ON c.id_cliente = v.id_cliente AND c.id_empresa = v.id_empresa
      WHERE v.id_empresa = @empresaId
        AND v.id_venda = @idVenda
        AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
      LIMIT 1
    `,
      { empresaId: auth.empresaId, idVenda },
    );
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    const itemRows = await this.db.query<{
      id_venda_item: string;
      id_produto: string | null;
      linha_produto: string | null;
      quantidade: number;
      valor_unitario: number;
      produto: string | null;
      cor: string | null;
      unidade_venda: string | null;
    }>(
      `
      SELECT
        i.id_venda_item,
        i.id_produto,
        i.linha_produto,
        i.quantidade,
        i.valor_unitario,
        COALESCE(cp.produto, i.linha_produto) AS produto,
        COALESCE(cp.cor, '') AS cor,
        COALESCE(cp.unidade_venda, 'UN') AS unidade_venda
      FROM ${itens} i
      LEFT JOIN ${catalogo} cp
        ON i.id_produto LIKE 'ctl_%'
       AND cp.id_produto = NULLIF(regexp_replace(i.id_produto, '^ctl_', ''), '')::int
      WHERE i.id_empresa = @empresaId AND i.id_venda = @idVenda
      ORDER BY i.criado_em, i.id_venda_item
    `,
      { empresaId: auth.empresaId, idVenda },
    );

    const custoRows = await this.db.query<{
      id_venda_item: string | null;
      valor_total_custo: number;
      observacao: string | null;
      tipo_custo: string | null;
      linha_produto: string | null;
    }>(
      `
      SELECT id_venda_item, valor_total_custo, observacao, tipo_custo, linha_produto
      FROM ${custos}
      WHERE id_empresa = @empresaId
        AND id_venda = @idVenda
        AND id_venda_item IS NOT NULL
      ORDER BY criado_em
    `,
      { empresaId: auth.empresaId, idVenda },
    );

    const [fluxoRow] = await this.db.query<{
      data_vencimento: string | null;
      status_financeiro: string | null;
      valor_previsto: number | null;
    }>(
      `
      SELECT data_vencimento, status_financeiro, valor_previsto
      FROM ${fluxo}
      WHERE id_empresa = @empresaId AND id_venda = @idVenda
      ORDER BY
        CASE WHEN UPPER(COALESCE(status_financeiro, '')) IN ('RECEBIDO', 'REALIZADO', 'PAGO') THEN 0 ELSE 1 END,
        criado_em
      LIMIT 1
    `,
      { empresaId: auth.empresaId, idVenda },
    );

    const gastosPorItem = new Map<
      string,
      Array<{
        idCustoCatalogo: number;
        descricao: string;
        tipoCusto: string | null;
        linha: string | null;
        valor: number;
      }>
    >();
    for (const c of custoRows) {
      if (!c.id_venda_item) continue;
      const idCat = parseCatCustoId(c.observacao);
      const descricao =
        c.observacao?.split(' | ')[0]?.trim() || 'Custo da venda';
      const list = gastosPorItem.get(c.id_venda_item) ?? [];
      list.push({
        idCustoCatalogo: idCat ?? 0,
        descricao,
        tipoCusto: c.tipo_custo,
        linha: c.linha_produto,
        valor: Number(c.valor_total_custo ?? 0),
      });
      gastosPorItem.set(c.id_venda_item, list);
    }

    const statusFluxo = (fluxoRow?.status_financeiro ?? 'PREVISTO').toUpperCase();
    const jaRecebido = ['RECEBIDO', 'REALIZADO', 'PAGO'].includes(statusFluxo);

    return {
      idVenda: venda.id_venda,
      idCliente: venda.id_cliente,
      cliente: venda.cliente,
      dataVenda: this.asDateString(venda.data_venda),
      dataPrevisaoRecebimento: this.asDateString(fluxoRow?.data_vencimento ?? null),
      observacao: venda.observacao,
      valorTotal: Number(venda.valor_total_informado ?? 0),
      status: venda.status_venda ?? 'FECHADA',
      jaRecebido,
      itens: itemRows.map((i) => {
        const idProdutoCatalogo = parseCtlProductId(i.id_produto);
        return {
          idVendaItem: i.id_venda_item,
          idProdutoCatalogo,
          linha: i.linha_produto ?? '',
          produto: i.produto ?? '',
          cor: i.cor ?? '',
          unidadeVenda: i.unidade_venda ?? 'UN',
          quantidade: Number(i.quantidade ?? 0),
          valorUnitario: Number(i.valor_unitario ?? 0),
          gastos: (gastosPorItem.get(i.id_venda_item) ?? []).filter(
            (g) => g.idCustoCatalogo > 0,
          ),
        };
      }),
    };
  }

  async atualizarVenda(
    auth: AuthContext,
    idVenda: string,
    dto: AtualizarVendaDto,
  ) {
    this.assertOperador(auth);

    const atual = await this.obterVenda(auth, idVenda);
    const dataVenda = dto.dataVenda ?? atual.dataVenda ?? todayIsoDate();
    const agora = new Date().toISOString();
    const valorTotal = dto.itens.reduce(
      (acc, item) => acc + item.quantidade * item.valorUnitario,
      0,
    );

    const [cliente] = await this.db.query<{ id_cliente: string; nome: string }>(
      `
      SELECT id_cliente, nome
      FROM ${this.db.table('dim_cliente')}
      WHERE id_cliente = @idCliente
        AND id_empresa = @empresaId
        AND COALESCE(ativo, TRUE) = TRUE
      LIMIT 1
    `,
      { idCliente: dto.idCliente, empresaId: auth.empresaId },
    );
    if (!cliente) {
      throw new BadRequestException(
        'Cliente inválido ou inativo. Cadastre ou selecione um cliente da lista.',
      );
    }

    const dimProdutos = this.buildDimProdutoRows(auth, dto.itens);
    const itemRows = dto.itens.map((item) => {
      const idVendaItem = `vit_${randomUUID().replace(/-/g, '')}`;
      const total = item.quantidade * item.valorUnitario;
      const gastos = item.gastos ?? [];
      const custoTotal = gastos.reduce((a, g) => a + g.valor, 0);
      return {
        idVendaItem,
        row: {
          id_venda_item: idVendaItem,
          id_venda: idVenda,
          id_empresa: auth.empresaId,
          id_produto: catalogProductId(item.idProdutoCatalogo),
          linha_produto: item.linha,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          valor_total_item: total,
          custo_unitario_estimado:
            item.quantidade > 0 ? custoTotal / item.quantidade : null,
          custo_total_estimado: custoTotal > 0 ? custoTotal : null,
          data_venda: dataVenda,
          id_usuario_criacao: auth.userId,
          criado_em: agora,
          id_usuario_alteracao: auth.userId,
          alterado_em: agora,
          origem: 'CRM_LANCAMENTOS',
        },
        item,
      };
    });

    const custoRows: Record<string, unknown>[] = [];
    for (const { idVendaItem, item } of itemRows) {
      for (const gasto of item.gastos ?? []) {
        custoRows.push(
          this.buildCustoRow(auth, {
            gasto,
            data: dataVenda,
            agora,
            idVenda,
            idVendaItem,
            linhaProduto: item.linha,
            idProdutoConsumido: catalogProductId(item.idProdutoCatalogo),
            destino: 'ITEM_VENDA',
          }),
        );
      }
    }

    const vendas = this.db.table('fato_venda');
    const itens = this.db.table('fato_venda_item');
    const custos = this.db.table('fato_custos_operacionais');
    const fluxo = this.db.table('fato_fluxo_caixa');

    await this.db.transaction(async (tx) => {
      await this.upsertDimProdutos(tx, dimProdutos);
      await this.ensurePlanoContas(
        tx,
        auth.empresaId,
        'pc_receita_vendas',
        'RECEITA',
        'Vendas',
        'Recebimento de vendas',
      );

      // Custos de item e os próprios itens são recriados; custos avulsos da venda ficam.
      await tx.query(
        `
        DELETE FROM ${custos}
        WHERE id_empresa = @empresaId
          AND id_venda = @idVenda
          AND id_venda_item IS NOT NULL
      `,
        { empresaId: auth.empresaId, idVenda },
      );
      await tx.query(
        `
        DELETE FROM ${itens}
        WHERE id_empresa = @empresaId AND id_venda = @idVenda
      `,
        { empresaId: auth.empresaId, idVenda },
      );

      await tx.query(
        `
        UPDATE ${vendas}
        SET id_cliente = @idCliente,
            data_venda = @dataVenda,
            valor_total_informado = @valorTotal,
            observacao = @observacao,
            id_usuario_alteracao = @userId,
            alterado_em = @agora
        WHERE id_empresa = @empresaId AND id_venda = @idVenda
      `,
        {
          empresaId: auth.empresaId,
          idVenda,
          idCliente: dto.idCliente,
          dataVenda,
          valorTotal,
          observacao: dto.observacao ?? null,
          userId: auth.userId,
          agora,
        },
      );

      await tx.insert(
        itens,
        itemRows.map((x) => x.row),
      );
      if (custoRows.length) {
        await tx.insert(custos, custoRows);
      }

      await tx.query(
        `
        UPDATE ${fluxo}
        SET data_vencimento = @previsao,
            valor_previsto = @valorTotal,
            valor_realizado = CASE
              WHEN UPPER(COALESCE(status_financeiro, '')) IN ('RECEBIDO', 'REALIZADO', 'PAGO')
              THEN @valorTotal
              ELSE valor_realizado
            END,
            data_competencia = @dataVenda,
            descricao = @descricao,
            id_usuario_alteracao = @userId,
            alterado_em = @agora
        WHERE id_empresa = @empresaId AND id_venda = @idVenda
      `,
        {
          empresaId: auth.empresaId,
          idVenda,
          previsao: dto.dataPrevisaoRecebimento,
          valorTotal,
          dataVenda,
          descricao: `Recebimento previsto — ${cliente.nome}`,
          userId: auth.userId,
          agora,
        },
      );
    });

    return {
      idVenda,
      idCliente: dto.idCliente,
      cliente: cliente.nome,
      dataVenda,
      dataPrevisaoRecebimento: dto.dataPrevisaoRecebimento,
      valorTotal,
      qtdItens: dto.itens.length,
      qtdGastos: custoRows.length,
      jaRecebido: atual.jaRecebido,
      mensagem: `Venda atualizada · ${cliente.nome}`,
    };
  }

  async excluirVenda(auth: AuthContext, idVenda: string) {
    this.assertOperador(auth);

    const existe = await this.vendaExiste(auth.empresaId, idVenda);
    if (!existe) {
      throw new NotFoundException('Venda não encontrada para esta empresa');
    }

    const vendas = this.db.table('fato_venda');
    const custos = this.db.table('fato_custos_operacionais');
    const fluxo = this.db.table('fato_fluxo_caixa');

    const [fluxoInfo] = await this.db.query<{
      recebido: boolean;
    }>(
      `
      SELECT EXISTS (
        SELECT 1 FROM ${fluxo}
        WHERE id_empresa = @empresaId
          AND id_venda = @idVenda
          AND UPPER(COALESCE(status_financeiro, '')) IN ('RECEBIDO', 'REALIZADO', 'PAGO')
      ) AS recebido
    `,
      { empresaId: auth.empresaId, idVenda },
    );

    await this.db.transaction(async (tx) => {
      await tx.query(
        `
        DELETE FROM ${fluxo}
        WHERE id_empresa = @empresaId AND id_venda = @idVenda
      `,
        { empresaId: auth.empresaId, idVenda },
      );
      await tx.query(
        `
        DELETE FROM ${custos}
        WHERE id_empresa = @empresaId AND id_venda = @idVenda
      `,
        { empresaId: auth.empresaId, idVenda },
      );
      // fato_venda_item cascateia via FK ON DELETE CASCADE.
      await tx.query(
        `
        DELETE FROM ${vendas}
        WHERE id_empresa = @empresaId AND id_venda = @idVenda
      `,
        { empresaId: auth.empresaId, idVenda },
      );
    });

    return {
      idVenda,
      jaRecebido: Boolean(fluxoInfo?.recebido),
      mensagem: 'Venda excluída',
    };
  }

  async criarCusto(auth: AuthContext, dto: CriarCustoDto) {
    this.assertOperador(auth);
    const dataCusto = dto.dataCusto ?? todayIsoDate();
    const agora = new Date().toISOString();

    if (dto.associadoAVenda) {
      if (!dto.idVenda) {
        throw new NotFoundException('Informe a venda para associar o custo');
      }
      const existe = await this.vendaExiste(auth.empresaId, dto.idVenda);
      if (!existe) {
        throw new NotFoundException('Venda não encontrada para esta empresa');
      }
    }

    const row = this.buildCustoRow(auth, {
      gasto: {
        idCustoCatalogo: dto.idCustoCatalogo,
        descricao: dto.descricao,
        tipoCusto: dto.tipoCusto,
        espessura: dto.espessura,
        linha: dto.linha,
        valor: dto.valor,
        quantidade: dto.quantidade,
      },
      data: dataCusto,
      agora,
      idVenda: dto.associadoAVenda ? dto.idVenda : null,
      idVendaItem: null,
      linhaProduto: dto.linha ?? null,
      idProdutoConsumido: null,
      destino: dto.associadoAVenda ? 'VENDA' : 'ESTOQUE',
      observacaoExtra: dto.observacao,
    });

    await this.db.transaction(async (tx) => {
      await this.ensureProdutoDeCusto(tx, auth.empresaId, dto.idCustoCatalogo);
      await tx.insert(this.db.table('fato_custos_operacionais'), [row]);
    });

    return {
      idCusto: row.id_custo,
      associadoAVenda: dto.associadoAVenda,
      idVenda: dto.idVenda ?? null,
      destino: dto.associadoAVenda ? 'VENDA' : 'ESTOQUE',
      mensagem: dto.associadoAVenda
        ? 'Custo associado à venda e gravado no analytics'
        : 'Custo incluído em estoque e gravado no analytics',
    };
  }

  private async vendaExiste(empresaId: string, idVenda: string) {
    const vendas = this.db.table('fato_venda');
    const rows = await this.db.query<{ id_venda: string }>(
      `
      SELECT id_venda
      FROM ${vendas}
      WHERE id_empresa = @empresaId AND id_venda = @idVenda
      LIMIT 1
    `,
      { empresaId, idVenda },
    );
    return rows.length > 0;
  }

  private buildDimProdutoRows(auth: AuthContext, itens: ItemVendaDto[]) {
    const map = new Map<string, Record<string, unknown>>();
    for (const item of itens) {
      const id = catalogProductId(item.idProdutoCatalogo);
      if (map.has(id)) continue;
      map.set(id, {
        id_produto: id,
        id_empresa: auth.empresaId,
        nome_produto: item.produto,
        tipo_item: item.produto,
        linha_produto: item.linha,
        unidade_medida: item.unidadeVenda ?? 'UN',
      });
    }
    return [...map.values()];
  }

  /** A dimensão é compartilhada entre lançamentos: só o primeiro cadastra. */
  private async upsertDimProdutos(
    tx: Queryable,
    rows: Record<string, unknown>[],
  ) {
    if (!rows.length) return;

    for (const row of rows) {
      await tx.query(
        `
        INSERT INTO ${this.db.table('dim_produto')}
          (id_produto, id_empresa, nome_produto, tipo_item, linha_produto, unidade_medida)
        VALUES (@idProduto, @idEmpresa, @nomeProduto, @tipoItem, @linhaProduto, @unidadeMedida)
        ON CONFLICT (id_produto) DO NOTHING
      `,
        {
          idProduto: row.id_produto,
          idEmpresa: row.id_empresa,
          nomeProduto: row.nome_produto,
          tipoItem: row.tipo_item,
          linhaProduto: row.linha_produto,
          unidadeMedida: row.unidade_medida,
        },
      );
    }
  }

  /**
   * Custo lançado fora de uma venda consome um insumo do catálogo, não um SKU
   * comercial. Registra esse insumo na dimensão para o custo ter produto real.
   */
  private async ensureProdutoDeCusto(
    tx: Queryable,
    empresaId: string,
    idCustoCatalogo: number,
  ) {
    const idProduto = catalogCostProductId(idCustoCatalogo);
    await tx.query(
      `
      INSERT INTO ${this.db.table('dim_produto')}
        (id_produto, id_empresa, nome_produto, tipo_item, linha_produto, unidade_medida)
      SELECT
        @idProduto,
        @empresaId,
        c.descricao,
        c.tipo_custo,
        c.linha,
        COALESCE(c.unidade_custo, 'UN')
      FROM ${this.db.catalogTable('ctl_custos')} c
      WHERE c.id_custo = @idCustoCatalogo
      ON CONFLICT (id_produto) DO NOTHING
    `,
      { idProduto, empresaId, idCustoCatalogo },
    );
    return idProduto;
  }

  private buildCustoRow(
    auth: AuthContext,
    opts: {
      gasto: GastoItemDto;
      data: string;
      agora: string;
      idVenda: string | null | undefined;
      idVendaItem: string | null;
      linhaProduto: string | null;
      idProdutoConsumido: string | null;
      destino: 'ITEM_VENDA' | 'VENDA' | 'ESTOQUE';
      observacaoExtra?: string;
    },
  ) {
    const qtd = opts.gasto.quantidade ?? 1;
    const observacao = [
      opts.gasto.descricao,
      opts.gasto.espessura ? `espessura ${opts.gasto.espessura}` : null,
      opts.destino === 'ESTOQUE' ? 'Destino: ESTOQUE' : null,
      opts.destino === 'VENDA' ? 'Destino: VENDA' : null,
      opts.destino === 'ITEM_VENDA' ? 'Destino: ITEM_VENDA' : null,
      opts.observacaoExtra,
      `cat_custo:${opts.gasto.idCustoCatalogo}`,
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      id_custo: `cst_${randomUUID().replace(/-/g, '')}`,
      id_empresa: auth.empresaId,
      // Obra e fornecedor só são conhecidos em lançamentos com origem em NF.
      id_projeto: null,
      id_produto_consumido:
        opts.idProdutoConsumido ??
        catalogCostProductId(opts.gasto.idCustoCatalogo),
      id_fornecedor: null,
      quantidade: qtd,
      valor_unitario: opts.gasto.valor / qtd,
      valor_total_custo: opts.gasto.valor,
      data_emissao_nf: opts.data,
      id_venda: opts.idVenda ?? null,
      id_venda_item: opts.idVendaItem,
      linha_produto: opts.linhaProduto,
      tipo_custo: opts.gasto.tipoCusto ?? 'OPERACIONAL',
      id_motivo_custo: null,
      etapa_ocorrencia: null,
      quantidade_perdida: null,
      id_funcionario_responsavel: null,
      id_custo_origem: null,
      observacao,
      data_ocorrencia: opts.data,
      id_usuario_criacao: auth.userId,
      criado_em: opts.agora,
      id_usuario_alteracao: null,
      alterado_em: null,
      origem: 'CRM_LANCAMENTOS',
    };
  }

  private async ensurePlanoContas(
    tx: Queryable,
    empresaId: string,
    idConta: string,
    tipoConta: string,
    categoria: string,
    subcategoria: string,
  ) {
    await tx.query(
      `
      INSERT INTO ${this.db.table('dim_plano_contas')}
        (id_conta, id_empresa, tipo_conta, categoria, subcategoria)
      VALUES (@idConta, @empresaId, @tipoConta, @categoria, @subcategoria)
      ON CONFLICT (id_conta) DO NOTHING
    `,
      { idConta, empresaId, tipoConta, categoria, subcategoria },
    );
    return idConta;
  }

  private asDateString(value: string | null): string {
    if (!value) return '';
    return value.slice(0, 10);
  }
}
