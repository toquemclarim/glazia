import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthContext } from '../auth/auth-context';
import { DatabaseService } from '../database/database.service';

function currentMonthUtc(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}`;
}

function nextMonth(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Competência como intervalo [início, fim) em vez de formatar a data em texto:
 * o filtro passa a usar os índices por data das tabelas de fato.
 */
function monthRange(mes: string): { mesInicio: string; mesFim: string } {
  const [year, month] = mes.split('-').map(Number);
  const inicio = new Date(Date.UTC(year, month - 1, 1));
  const fim = new Date(Date.UTC(year, month, 1));
  return {
    mesInicio: inicio.toISOString().slice(0, 10),
    mesFim: fim.toISOString().slice(0, 10),
  };
}

/** Remove códigos internos (vnd_, ctl_, etc.) de textos exibidos na UI. */
function textoAmigavelFinanceiro(
  descricao: string | null,
  opts: { temVenda: boolean; cliente: string | null },
): string | null {
  if (!descricao?.trim()) {
    if (opts.cliente) return `Recebimento — ${opts.cliente}`;
    return opts.temVenda ? 'Recebimento de venda' : null;
  }

  let texto = descricao
    .replace(/\bRecebimento previsto da venda\s+\S+/gi, 'Recebimento previsto de venda')
    .replace(/\bVenda\s+(vnd_|vit_|flx_)[a-zA-Z0-9]+/gi, 'Venda')
    .replace(/\b(vnd_|vit_|flx_|ctl_|custo_cat_|pc_)[a-zA-Z0-9_-]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s·/|,;:.–—-]+$/g, '')
    .trim();

  if (!texto || /^(venda|recebimento|recebimento previsto)$/i.test(texto)) {
    if (opts.cliente) return `Recebimento — ${opts.cliente}`;
    return opts.temVenda ? 'Recebimento de venda' : null;
  }

  return texto;
}

function roundMoney(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

function novoIdFluxo(): string {
  return `flx_${randomUUID().replace(/-/g, '')}`;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Resultado do mês: ganhando/perdendo/lucrando.
   * Receita = SUM(fato_venda_item.valor_total_item) de vendas não canceladas.
   */
  async resultadoMensal(empresaId: string, mes = currentMonthUtc()) {
    const itens = this.db.table('fato_venda_item');
    const vendas = this.db.table('fato_venda');
    const custos = this.db.table('fato_custos_operacionais');
    const cadastro = this.db.table('cad_despesa_fixa');

    const sql = `
      WITH receita AS (
        SELECT COALESCE(SUM(i.valor_total_item), 0) AS valor
        FROM ${itens} i
        INNER JOIN ${vendas} v
          ON v.id_venda = i.id_venda
         AND v.id_empresa = i.id_empresa
        WHERE i.id_empresa = @empresaId
          AND i.data_venda >= @mesInicio AND i.data_venda < @mesFim
          AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
      ),
      custo_variavel AS (
        SELECT
          COALESCE(SUM(valor_total_custo), 0) AS valor,
          COALESCE(SUM(valor_total_custo) FILTER (WHERE id_venda IS NOT NULL), 0) AS valor_venda,
          COALESCE(SUM(valor_total_custo) FILTER (WHERE id_venda IS NULL), 0) AS valor_estoque
        FROM ${custos}
        WHERE id_empresa = @empresaId
          AND data_emissao_nf >= @mesInicio AND data_emissao_nf < @mesFim
      ),
      /*
       * Competência, não caixa: o custo fixo pertence a todo mês em que a
       * despesa está vigente, mesmo que a parcela vença em outro mês ou que
       * o cadastro tenha nascido depois do dia de vencimento. Mesma fonte da
       * tela de Custos fixos, para os dois números nunca divergirem.
       */
      custo_fixo AS (
        SELECT COALESCE(SUM(d.valor_mensal), 0) AS valor
        FROM ${cadastro} d
        WHERE d.id_empresa = @empresaId
          AND COALESCE(d.ativo, TRUE) = TRUE
          AND d.data_inicio < @mesFim
          AND (d.data_fim IS NULL OR d.data_fim >= @mesInicio)
      )
      SELECT
        receita.valor AS faturamento,
        custo_variavel.valor AS custos_variaveis,
        custo_variavel.valor_venda AS custos_variaveis_venda,
        custo_variavel.valor_estoque AS custos_variaveis_estoque,
        custo_fixo.valor AS custos_fixos,
        receita.valor - custo_variavel.valor AS margem_contribuicao,
        receita.valor - custo_variavel.valor - custo_fixo.valor AS lucro_operacional,
        (receita.valor - custo_variavel.valor) / NULLIF(receita.valor, 0) AS margem_percentual
      FROM receita, custo_variavel, custo_fixo
    `;

    const [row] = await this.db.query<{
      faturamento: number;
      custos_variaveis: number;
      custos_variaveis_venda: number;
      custos_variaveis_estoque: number;
      custos_fixos: number;
      margem_contribuicao: number;
      lucro_operacional: number;
      margem_percentual: number | null;
    }>(sql, { empresaId, ...monthRange(mes) });

    const lucro = Number(row?.lucro_operacional ?? 0);
    const custosVariaveis = Number(row?.custos_variaveis ?? 0);
    const custosVariaveisEstoque = Number(row?.custos_variaveis_estoque ?? 0);

    const custosEstoqueMes = await this.listarCustosEstoqueDoMes(
      empresaId,
      mes,
    );

    return {
      mes,
      faturamento: Number(row?.faturamento ?? 0),
      custosVariaveis,
      custosVariaveisVenda: Number(row?.custos_variaveis_venda ?? 0),
      custosVariaveisEstoque,
      custosFixos: Number(row?.custos_fixos ?? 0),
      margemContribuicao: Number(row?.margem_contribuicao ?? 0),
      margemPercentual: Number(row?.margem_percentual ?? 0),
      lucroOperacional: lucro,
      lucrativo: lucro > 0,
      deficitario: lucro < 0,
      custosEstoqueMes,
    };
  }

  /** Lista compacta de custos de estoque do mês (para o card da Análise). */
  private async listarCustosEstoqueDoMes(empresaId: string, mes: string) {
    const custos = this.db.table('fato_custos_operacionais');
    const range = monthRange(mes);
    const rows = await this.db.query<{
      id_custo: string;
      data_emissao_nf: string | null;
      tipo_custo: string | null;
      linha_produto: string | null;
      quantidade: number | null;
      valor_unitario: number | null;
      valor_total_custo: number;
      observacao: string | null;
    }>(
      `
      SELECT
        id_custo, data_emissao_nf, tipo_custo, linha_produto,
        quantidade, valor_unitario, valor_total_custo, observacao
      FROM ${custos}
      WHERE id_empresa = @empresaId
        AND id_venda IS NULL
        AND data_emissao_nf >= @mesInicio
        AND data_emissao_nf < @mesFim
      ORDER BY data_emissao_nf DESC, criado_em DESC
      LIMIT 50
    `,
      { empresaId, ...range },
    );

    return rows.map((r) => {
      const valor = Number(r.valor_total_custo ?? 0);
      const quantidade =
        r.quantidade != null && Number(r.quantidade) > 0
          ? Number(r.quantidade)
          : 1;
      const valorUnitario =
        r.valor_unitario != null && Number.isFinite(Number(r.valor_unitario))
          ? Number(r.valor_unitario)
          : valor / quantidade;
      return {
        idCusto: r.id_custo,
        dataCusto: (r.data_emissao_nf ?? '').toString().slice(0, 10),
        tipoCusto: r.tipo_custo,
        linha: r.linha_produto,
        descricao:
          r.observacao?.split(' | ')[0]?.trim() || 'Custo de estoque',
        quantidade,
        valorUnitario,
        valor,
      };
    });
  }

  /** Rentabilidade por produto e por linha (snapshot no item). */
  async rentabilidadeProdutos(empresaId: string, mes = currentMonthUtc()) {
    const itens = this.db.table('fato_venda_item');
    const vendas = this.db.table('fato_venda');
    const custos = this.db.table('fato_custos_operacionais');
    const produtos = this.db.table('dim_produto');

    const sql = `
      WITH receita AS (
        SELECT
          COALESCE(p.nome_produto, i.id_produto) AS produto,
          i.linha_produto AS linha,
          SUM(i.valor_total_item) AS receita,
          SUM(i.quantidade) AS quantidade,
          COUNT(DISTINCT i.id_venda) AS qtd_vendas
        FROM ${itens} i
        INNER JOIN ${vendas} v
          ON v.id_venda = i.id_venda
         AND v.id_empresa = i.id_empresa
        LEFT JOIN ${produtos} p
          ON p.id_produto = i.id_produto
         AND (p.id_empresa IS NULL OR p.id_empresa = i.id_empresa)
        WHERE i.id_empresa = @empresaId
          AND i.data_venda >= @mesInicio AND i.data_venda < @mesFim
          AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
        GROUP BY COALESCE(p.nome_produto, i.id_produto), i.linha_produto
      ),
      custo AS (
        SELECT
          COALESCE(p.nome_produto, c.id_produto_consumido, c.tipo_custo, 'Custo') AS produto,
          COALESCE(c.linha_produto, p.linha_produto, 'Sem linha') AS linha,
          SUM(c.valor_total_custo) AS custo
        FROM ${custos} c
        LEFT JOIN ${produtos} p
          ON p.id_produto = c.id_produto_consumido
         AND (p.id_empresa IS NULL OR p.id_empresa = c.id_empresa)
        WHERE c.id_empresa = @empresaId
          AND c.data_emissao_nf >= @mesInicio AND c.data_emissao_nf < @mesFim
        GROUP BY
          COALESCE(p.nome_produto, c.id_produto_consumido, c.tipo_custo, 'Custo'),
          COALESCE(c.linha_produto, p.linha_produto, 'Sem linha')
      )
      SELECT
        COALESCE(r.produto, c.produto) AS produto,
        COALESCE(r.linha, c.linha) AS linha,
        COALESCE(r.receita, 0) AS receita,
        COALESCE(c.custo, 0) AS custo,
        COALESCE(r.receita, 0) - COALESCE(c.custo, 0) AS lucro,
        COALESCE(r.quantidade, 0) AS quantidade,
        COALESCE(r.qtd_vendas, 0) AS qtd_vendas
      FROM receita r
      FULL OUTER JOIN custo c
        ON c.produto = r.produto
       AND c.linha = r.linha
      ORDER BY lucro DESC
    `;

    const rows = await this.db.query<{
      produto: string;
      linha: string | null;
      receita: number;
      custo: number;
      lucro: number;
      quantidade: number;
      qtd_vendas: number;
    }>(sql, { empresaId, ...monthRange(mes) });

    const porProduto = rows.map((row) => ({
      produto: row.produto,
      linha: row.linha,
      receita: Number(row.receita),
      custo: Number(row.custo),
      lucro: Number(row.lucro),
      quantidade: Number(row.quantidade),
      qtdVendas: Number(row.qtd_vendas),
    }));

    const linhaMap = new Map<
      string,
      {
        linha: string;
        receita: number;
        custo: number;
        lucro: number;
        quantidade: number;
      }
    >();

    for (const item of porProduto) {
      const linha = item.linha ?? 'Sem linha';
      const atual = linhaMap.get(linha) ?? {
        linha,
        receita: 0,
        custo: 0,
        lucro: 0,
        quantidade: 0,
      };
      atual.receita += item.receita;
      atual.custo += item.custo;
      atual.lucro += item.lucro;
      atual.quantidade += item.quantidade;
      linhaMap.set(linha, atual);
    }

    const porLinha = Array.from(linhaMap.values()).sort(
      (a, b) => b.lucro - a.lucro,
    );

    const porCliente = await this.rentabilidadeClientes(empresaId, mes);
    const { mixPorTipo, mixPorSlot } = await this.mixCoresVenda(empresaId, mes);

    return {
      mes,
      porProduto,
      porLinha,
      porCliente,
      mixPorTipo,
      mixPorSlot,
      maisRentavel: porProduto[0] ?? null,
      menosRentavel: porProduto.length
        ? porProduto[porProduto.length - 1]
        : null,
    };
  }

  /** Mix de cores informadas (NULL não entra no recorte do slot). */
  private async mixCoresVenda(empresaId: string, mes: string) {
    const itens = this.db.table('fato_venda_item');
    const vendas = this.db.table('fato_venda');
    const range = monthRange(mes);
    const filtro = `
      i.id_empresa = @empresaId
      AND i.data_venda >= @mesInicio AND i.data_venda < @mesFim
      AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
    `;

    const tipos = await this.db.query<{
      tipo: string;
      receita: number;
      quantidade: number;
      qtd_itens: number;
    }>(
      `
      SELECT
        i.tipo_cor_principal AS tipo,
        SUM(i.valor_total_item) AS receita,
        SUM(i.quantidade) AS quantidade,
        COUNT(*)::int AS qtd_itens
      FROM ${itens} i
      INNER JOIN ${vendas} v
        ON v.id_venda = i.id_venda AND v.id_empresa = i.id_empresa
      WHERE ${filtro}
      GROUP BY i.tipo_cor_principal
      ORDER BY receita DESC
    `,
      { empresaId, ...range },
    );

    const slots = await this.db.query<{
      slot: string;
      cor: string;
      receita: number;
      quantidade: number;
      qtd_itens: number;
    }>(
      `
      SELECT slot, cor, SUM(receita) AS receita, SUM(quantidade) AS quantidade,
             COUNT(*)::int AS qtd_itens
      FROM (
        SELECT 'PERFIL'::text AS slot, i.cor_perfil AS cor,
               i.valor_total_item AS receita, i.quantidade
        FROM ${itens} i
        INNER JOIN ${vendas} v
          ON v.id_venda = i.id_venda AND v.id_empresa = i.id_empresa
        WHERE ${filtro} AND i.cor_perfil IS NOT NULL
        UNION ALL
        SELECT 'VIDRO', i.cor_vidro, i.valor_total_item, i.quantidade
        FROM ${itens} i
        INNER JOIN ${vendas} v
          ON v.id_venda = i.id_venda AND v.id_empresa = i.id_empresa
        WHERE ${filtro} AND i.cor_vidro IS NOT NULL
        UNION ALL
        SELECT 'ACESSORIO', i.cor_acessorio, i.valor_total_item, i.quantidade
        FROM ${itens} i
        INNER JOIN ${vendas} v
          ON v.id_venda = i.id_venda AND v.id_empresa = i.id_empresa
        WHERE ${filtro} AND i.cor_acessorio IS NOT NULL
      ) x
      GROUP BY slot, cor
      ORDER BY slot, receita DESC
    `,
      { empresaId, ...range },
    );

    return {
      mixPorTipo: tipos.map((r) => ({
        tipo: r.tipo as 'PERFIL' | 'VIDRO' | 'ACESSORIO',
        receita: Number(r.receita),
        quantidade: Number(r.quantidade),
        qtdItens: Number(r.qtd_itens),
      })),
      mixPorSlot: slots.map((r) => ({
        slot: r.slot as 'PERFIL' | 'VIDRO' | 'ACESSORIO',
        cor: r.cor,
        receita: Number(r.receita),
        quantidade: Number(r.quantidade),
        qtdItens: Number(r.qtd_itens),
      })),
    };
  }

  /** Lucro por cliente no mês (receita da venda − custos vinculados à venda). */
  async rentabilidadeClientes(empresaId: string, mes = currentMonthUtc()) {
    const itens = this.db.table('fato_venda_item');
    const vendas = this.db.table('fato_venda');
    const clientes = this.db.table('dim_cliente');
    const custos = this.db.table('fato_custos_operacionais');

    const rows = await this.db.query<{
      id_cliente: string;
      cliente: string;
      receita: number;
      custo: number;
      lucro: number;
      qtd_vendas: number;
    }>(
      `
      WITH receita AS (
        SELECT
          v.id_cliente,
          COALESCE(NULLIF(TRIM(c.nome), ''), 'Cliente') AS cliente,
          SUM(i.valor_total_item) AS receita,
          COUNT(DISTINCT v.id_venda) AS qtd_vendas
        FROM ${itens} i
        INNER JOIN ${vendas} v
          ON v.id_venda = i.id_venda AND v.id_empresa = i.id_empresa
        LEFT JOIN ${clientes} c
          ON c.id_cliente = v.id_cliente AND c.id_empresa = v.id_empresa
        WHERE i.id_empresa = @empresaId
          AND i.data_venda >= @mesInicio AND i.data_venda < @mesFim
          AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
        GROUP BY v.id_cliente, COALESCE(NULLIF(TRIM(c.nome), ''), 'Cliente')
      ),
      custo AS (
        SELECT
          v.id_cliente,
          SUM(co.valor_total_custo) AS custo
        FROM ${custos} co
        INNER JOIN ${vendas} v
          ON v.id_venda = co.id_venda AND v.id_empresa = co.id_empresa
        WHERE co.id_empresa = @empresaId
          AND co.id_venda IS NOT NULL
          AND v.data_venda >= @mesInicio AND v.data_venda < @mesFim
          AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
        GROUP BY v.id_cliente
      )
      SELECT
        r.id_cliente,
        r.cliente,
        r.receita,
        COALESCE(c.custo, 0) AS custo,
        r.receita - COALESCE(c.custo, 0) AS lucro,
        r.qtd_vendas
      FROM receita r
      LEFT JOIN custo c ON c.id_cliente = r.id_cliente
      ORDER BY lucro DESC
      LIMIT 20
    `,
      { empresaId, ...monthRange(mes) },
    );

    return rows.map((row) => ({
      idCliente: row.id_cliente,
      cliente: row.cliente,
      receita: Number(row.receita),
      custo: Number(row.custo),
      lucro: Number(row.lucro),
      qtdVendas: Number(row.qtd_vendas),
    }));
  }

  /** Quantas peças de um produto (ex.: Janela) no mês, com breakdown por linha. */
  async quantidadeProduto(
    empresaId: string,
    produto: string,
    mes = currentMonthUtc(),
  ) {
    const itens = this.db.table('fato_venda_item');
    const vendas = this.db.table('fato_venda');
    const produtos = this.db.table('dim_produto');

    const sql = `
      SELECT
        p.nome_produto AS produto,
        i.linha_produto AS linha,
        SUM(i.quantidade) AS quantidade,
        COUNT(DISTINCT i.id_venda) AS qtd_vendas,
        COALESCE(SUM(i.valor_total_item), 0) AS faturamento
      FROM ${itens} i
      INNER JOIN ${vendas} v
        ON v.id_venda = i.id_venda
       AND v.id_empresa = i.id_empresa
      JOIN ${produtos} p ON p.id_produto = i.id_produto
      WHERE i.id_empresa = @empresaId
        AND i.data_venda >= @mesInicio AND i.data_venda < @mesFim
        AND UPPER(COALESCE(v.status_venda, 'FECHADA')) <> 'CANCELADA'
        AND LOWER(p.nome_produto) LIKE '%' || LOWER(@produto) || '%'
      GROUP BY p.nome_produto, i.linha_produto
      ORDER BY quantidade DESC
    `;

    const rows = await this.db.query<{
      produto: string;
      linha: string;
      quantidade: number;
      qtd_vendas: number;
      faturamento: number;
    }>(sql, { empresaId, produto, ...monthRange(mes) });

    return {
      mes,
      filtro: produto,
      itens: rows.map((row) => ({
        produto: row.produto,
        linha: row.linha,
        quantidade: Number(row.quantidade),
        quantidadeVendas: Number(row.qtd_vendas),
        faturamento: Number(row.faturamento),
      })),
      totalPecas: rows.reduce((sum, row) => sum + Number(row.quantidade), 0),
      totalVendas: rows.reduce((sum, row) => sum + Number(row.qtd_vendas), 0),
      observacao:
        'Quantidade física vem de fato_venda_item.quantidade. Uma venda pode ter vários itens e várias linhas.',
    };
  }

  /** Custos fixos vigentes (cadastro com vigência) + vencimentos do mês no fluxo. */
  async custosFixos(empresaId: string, mes = currentMonthUtc()) {
    const cadastro = this.db.table('cad_despesa_fixa');
    const plano = this.db.table('dim_plano_contas');
    const fluxo = this.db.table('fato_fluxo_caixa');

    const sqlCadastro = `
      SELECT
        d.id_despesa_fixa,
        d.descricao,
        d.valor_mensal,
        d.dia_vencimento,
        d.data_inicio,
        d.data_fim,
        d.ativo,
        p.categoria,
        p.subcategoria
      FROM ${cadastro} d
      LEFT JOIN ${plano} p ON p.id_conta = d.id_plano_contas
      WHERE d.id_empresa = @empresaId
        AND COALESCE(d.ativo, TRUE) = TRUE
        AND d.data_inicio < @mesFim
        AND (d.data_fim IS NULL OR d.data_fim >= @mesInicio)
      ORDER BY d.dia_vencimento, d.descricao
    `;

    const sqlFluxo = `
      SELECT
        p.categoria,
        p.subcategoria,
        f.data_vencimento,
        f.data_pagamento,
        f.valor_previsto,
        f.valor_realizado,
        f.status_financeiro,
        f.tipo_movimentacao,
        f.descricao,
        f.id_despesa_fixa
      FROM ${fluxo} f
      JOIN ${plano} p ON p.id_conta = f.id_plano_contas
      WHERE f.id_empresa = @empresaId
        AND f.data_vencimento >= @mesInicio AND f.data_vencimento < @mesFim
        AND (
          UPPER(p.tipo_conta) = 'DESPESA FIXA'
          OR f.id_despesa_fixa IS NOT NULL
        )
        AND UPPER(f.status_financeiro) <> 'CANCELADO'
      ORDER BY f.data_vencimento
    `;

    const range = monthRange(mes);

    const [cadastros, movimentos] = await Promise.all([
      this.db.query<{
        id_despesa_fixa: string;
        descricao: string;
        valor_mensal: number;
        dia_vencimento: number;
        data_inicio: string;
        data_fim: string | null;
        ativo: boolean | null;
        categoria: string | null;
        subcategoria: string | null;
      }>(sqlCadastro, { empresaId, ...range }),
      this.db.query<{
        categoria: string | null;
        subcategoria: string | null;
        data_vencimento: string;
        data_pagamento: string | null;
        valor_previsto: number;
        valor_realizado: number | null;
        status_financeiro: string;
        tipo_movimentacao: string;
        descricao: string | null;
        id_despesa_fixa: string | null;
      }>(sqlFluxo, { empresaId, ...range }),
    ]);

    const vigentes = cadastros.map((row) => ({
      id: row.id_despesa_fixa,
      descricao: row.descricao,
      categoria: row.categoria,
      subcategoria: row.subcategoria,
      valorMensal: Number(row.valor_mensal),
      diaVencimento: Number(row.dia_vencimento),
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      ativo: row.ativo ?? true,
    }));

    const itens = movimentos.map((row) => ({
      categoria: row.categoria,
      subcategoria: row.subcategoria,
      descricao: row.descricao,
      idDespesaFixa: row.id_despesa_fixa,
      dataVencimento: row.data_vencimento,
      dataPagamento: row.data_pagamento,
      valorPrevisto: Number(row.valor_previsto),
      valorRealizado:
        row.valor_realizado == null ? null : Number(row.valor_realizado),
      status: row.status_financeiro,
      tipo: row.tipo_movimentacao,
    }));

    return {
      mes,
      vigentes,
      totalMensalVigente: vigentes.reduce(
        (sum, item) => sum + item.valorMensal,
        0,
      ),
      totalPrevisto: itens.reduce((sum, item) => sum + item.valorPrevisto, 0),
      itens,
    };
  }

  /** Contas a vencer (qualquer tipo) em um mês — só em aberto. */
  async contasAVencer(empresaId: string, mes = currentMonthUtc()) {
    const fluxo = this.db.table('fato_fluxo_caixa');
    const plano = this.db.table('dim_plano_contas');

    const sql = `
      SELECT
        f.id_transacao,
        f.data_vencimento,
        f.valor_previsto,
        f.valor_realizado,
        f.status_financeiro,
        f.tipo_movimentacao,
        p.tipo_conta,
        p.categoria,
        p.subcategoria
      FROM ${fluxo} f
      JOIN ${plano} p ON p.id_conta = f.id_plano_contas
      WHERE f.id_empresa = @empresaId
        AND f.data_vencimento >= @mesInicio AND f.data_vencimento < @mesFim
        AND UPPER(f.status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
      ORDER BY f.data_vencimento
    `;

    const rows = await this.db.query<{
      id_transacao: string;
      data_vencimento: string;
      valor_previsto: number;
      valor_realizado: number | null;
      status_financeiro: string;
      tipo_movimentacao: string;
      tipo_conta: string;
      categoria: string | null;
      subcategoria: string | null;
    }>(sql, { empresaId, ...monthRange(mes) });

    return {
      mes,
      itens: rows.map((row) => ({
        idTransacao: row.id_transacao,
        dataVencimento: row.data_vencimento,
        valorPrevisto: Number(row.valor_previsto),
        status: row.status_financeiro,
        tipoMovimentacao: row.tipo_movimentacao,
        tipoConta: row.tipo_conta,
        categoria: row.categoria,
        subcategoria: row.subcategoria,
      })),
    };
  }

  /**
   * Dívidas a pagar: vencidas em aberto + próximas saídas (custos fixos e demais).
   * Usado pelo chat (“o que tenho que pagar?”).
   */
  async contasAPagar(empresaId: string, horizonteDias = 45) {
    const fluxo = this.db.table('fato_fluxo_caixa');
    const plano = this.db.table('dim_plano_contas');
    const dias = Math.min(Math.max(Number(horizonteDias) || 45, 1), 90);
    const hoje = new Date().toISOString().slice(0, 10);

    const rows = await this.db.query<{
      id_transacao: string;
      data_vencimento: string;
      valor_previsto: number;
      status_financeiro: string;
      tipo_movimentacao: string;
      tipo_conta: string;
      categoria: string | null;
      subcategoria: string | null;
      descricao: string | null;
    }>(
      `
      SELECT
        f.id_transacao,
        f.data_vencimento::text AS data_vencimento,
        f.valor_previsto,
        f.status_financeiro,
        f.tipo_movimentacao,
        p.tipo_conta,
        p.categoria,
        p.subcategoria,
        f.descricao
      FROM ${fluxo} f
      JOIN ${plano} p ON p.id_conta = f.id_plano_contas
      WHERE f.id_empresa = @empresaId
        AND UPPER(f.tipo_movimentacao) IN ('SAIDA', 'DESPESA', 'PAGAMENTO')
        AND UPPER(f.status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
        AND (
          f.data_vencimento < CURRENT_DATE
          OR (
            f.data_vencimento >= CURRENT_DATE
            AND f.data_vencimento < CURRENT_DATE + (@dias::int)
          )
        )
      ORDER BY f.data_vencimento ASC, f.valor_previsto DESC
    `,
      { empresaId, dias },
    );

    const itens = rows.map((row) => {
      const dataVencimento = row.data_vencimento.slice(0, 10);
      return {
        idTransacao: row.id_transacao,
        dataVencimento,
        valorPrevisto: Number(row.valor_previsto),
        status: row.status_financeiro,
        tipoMovimentacao: row.tipo_movimentacao,
        tipoConta: row.tipo_conta,
        categoria: row.categoria,
        subcategoria: row.subcategoria,
        descricao: row.descricao,
        vencida: dataVencimento < hoje,
      };
    });

    const vencidas = itens.filter((i) => i.vencida);
    const proximas = itens.filter((i) => !i.vencida);

    return {
      hoje,
      horizonteDias: dias,
      itens,
      vencidas,
      proximas,
      total: itens.reduce((s, i) => s + i.valorPrevisto, 0),
      totalVencido: vencidas.reduce((s, i) => s + i.valorPrevisto, 0),
      totalProximo: proximas.reduce((s, i) => s + i.valorPrevisto, 0),
    };
  }

  /**
   * Contas a receber do mês (entradas): previstas e já recebidas.
   * Usado na Análise para o diretor confirmar o caixa.
   */
  async contasAReceber(empresaId: string, mes = currentMonthUtc()) {
    const fluxo = this.db.table('fato_fluxo_caixa');
    const vendas = this.db.table('fato_venda');
    const clientes = this.db.table('dim_cliente');

    const rows = await this.db.query<{
      id_transacao: string;
      data_vencimento: string;
      data_pagamento: string | null;
      valor_previsto: number;
      valor_realizado: number | null;
      status_financeiro: string;
      descricao: string | null;
      id_venda: string | null;
      data_venda: string | null;
      cliente: string | null;
    }>(
      `
      SELECT
        f.id_transacao,
        f.data_vencimento,
        f.data_pagamento,
        f.valor_previsto,
        f.valor_realizado,
        f.status_financeiro,
        f.descricao,
        f.id_venda,
        v.data_venda,
        c.nome AS cliente
      FROM ${fluxo} f
      LEFT JOIN ${vendas} v
        ON v.id_venda = f.id_venda AND v.id_empresa = f.id_empresa
      LEFT JOIN ${clientes} c
        ON c.id_cliente = v.id_cliente AND c.id_empresa = f.id_empresa
      WHERE f.id_empresa = @empresaId
        AND UPPER(f.tipo_movimentacao) IN ('ENTRADA', 'RECEITA', 'RECEBIMENTO')
        AND UPPER(f.status_financeiro) <> 'CANCELADO'
        AND (
          (f.data_vencimento >= @mesInicio AND f.data_vencimento < @mesFim)
          OR (f.data_pagamento >= @mesInicio AND f.data_pagamento < @mesFim)
        )
      ORDER BY
        CASE WHEN UPPER(f.status_financeiro) IN ('RECEBIDO', 'REALIZADO', 'PAGO') THEN 1 ELSE 0 END,
        f.data_vencimento,
        f.id_transacao
    `,
      { empresaId, ...monthRange(mes) },
    );

    const itens = rows.map((row) => {
      const recebido = ['RECEBIDO', 'REALIZADO', 'PAGO'].includes(
        (row.status_financeiro ?? '').toUpperCase(),
      );
      const cliente = row.cliente?.trim() || null;
      const dataVenda = row.data_venda
        ? String(row.data_venda).slice(0, 10)
        : null;
      return {
        idTransacao: row.id_transacao,
        dataVencimento: row.data_vencimento,
        dataPagamento: row.data_pagamento,
        valorPrevisto: Number(row.valor_previsto),
        valorRealizado:
          row.valor_realizado == null ? null : Number(row.valor_realizado),
        status: row.status_financeiro,
        recebido,
        descricao: textoAmigavelFinanceiro(row.descricao, {
          temVenda: Boolean(row.id_venda),
          cliente,
        }),
        // Mantido para vínculo interno; a UI não deve exibir.
        idVenda: row.id_venda,
        dataVenda,
        cliente,
      };
    });

    return {
      mes,
      itens,
      totalPrevisto: itens.reduce((s, i) => s + i.valorPrevisto, 0),
      totalRecebido: itens
        .filter((i) => i.recebido)
        .reduce((s, i) => s + (i.valorRealizado ?? i.valorPrevisto), 0),
      totalEmAberto: itens
        .filter((i) => !i.recebido)
        .reduce((s, i) => s + i.valorPrevisto, 0),
    };
  }

  /**
   * Fluxo de caixa do mês — independente da DRE (faturamento por data_venda).
   * Entradas/saídas pelo vencimento (previsto) e pelo pagamento (realizado).
   */
  async fluxoCaixaMensal(empresaId: string, mes = currentMonthUtc()) {
    const fluxo = this.db.table('fato_fluxo_caixa');
    const range = monthRange(mes);

    const [row] = await this.db.query<{
      entradas_previstas: number;
      entradas_recebidas: number;
      saidas_previstas: number;
      saidas_pagas: number;
    }>(
      `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN UPPER(tipo_movimentacao) IN ('ENTRADA', 'RECEITA', 'RECEBIMENTO')
             AND data_vencimento >= @mesInicio AND data_vencimento < @mesFim
             AND UPPER(status_financeiro) <> 'CANCELADO'
            THEN valor_previsto ELSE 0
          END
        ), 0) AS entradas_previstas,
        COALESCE(SUM(
          CASE
            WHEN UPPER(tipo_movimentacao) IN ('ENTRADA', 'RECEITA', 'RECEBIMENTO')
             AND data_pagamento >= @mesInicio AND data_pagamento < @mesFim
             AND UPPER(status_financeiro) IN ('RECEBIDO', 'REALIZADO', 'PAGO')
            THEN COALESCE(valor_realizado, valor_previsto) ELSE 0
          END
        ), 0) AS entradas_recebidas,
        COALESCE(SUM(
          CASE
            WHEN UPPER(tipo_movimentacao) IN ('SAIDA', 'DESPESA', 'PAGAMENTO')
             AND data_vencimento >= @mesInicio AND data_vencimento < @mesFim
             AND UPPER(status_financeiro) <> 'CANCELADO'
            THEN valor_previsto ELSE 0
          END
        ), 0) AS saidas_previstas,
        COALESCE(SUM(
          CASE
            WHEN UPPER(tipo_movimentacao) IN ('SAIDA', 'DESPESA', 'PAGAMENTO')
             AND data_pagamento >= @mesInicio AND data_pagamento < @mesFim
             AND UPPER(status_financeiro) IN ('PAGO', 'REALIZADO', 'RECEBIDO')
            THEN COALESCE(valor_realizado, valor_previsto) ELSE 0
          END
        ), 0) AS saidas_pagas
      FROM ${fluxo}
      WHERE id_empresa = @empresaId
    `,
      { empresaId, ...range },
    );

    const entradasPrevistas = Number(row?.entradas_previstas ?? 0);
    const entradasRecebidas = Number(row?.entradas_recebidas ?? 0);
    const saidasPrevistas = Number(row?.saidas_previstas ?? 0);
    const saidasPagas = Number(row?.saidas_pagas ?? 0);

    return {
      mes,
      entradasPrevistas,
      entradasRecebidas,
      saidasPrevistas,
      saidasPagas,
      saldoPrevisto: entradasPrevistas - saidasPrevistas,
      saldoRealizado: entradasRecebidas - saidasPagas,
      caixaPositivoPrevisto: entradasPrevistas - saidasPrevistas >= 0,
      caixaPositivoRealizado: entradasRecebidas - saidasPagas >= 0,
    };
  }

  /** Diretor confirma que o cliente pagou a parcela (entra no caixa). */
  async marcarRecebido(
    auth: AuthContext,
    idTransacao: string,
    valorRecebido?: number,
  ) {
    // RBAC validado no controller (assertDiretoria).

    const fluxo = this.db.table('fato_fluxo_caixa');
    const vendas = this.db.table('fato_venda');
    const clientes = this.db.table('dim_cliente');
    const [parcela] = await this.db.query<{
      id_transacao: string;
      tipo_movimentacao: string;
      status_financeiro: string;
      valor_previsto: number;
      data_vencimento: string;
      data_competencia: string | null;
      descricao: string | null;
      id_venda: string | null;
      id_plano_contas: string | null;
      id_projeto: string | null;
      origem: string | null;
      cliente: string | null;
    }>(
      `
      SELECT
        f.id_transacao, f.tipo_movimentacao, f.status_financeiro,
        f.valor_previsto, f.data_vencimento, f.data_competencia,
        f.descricao, f.id_venda, f.id_plano_contas, f.id_projeto, f.origem,
        c.nome AS cliente
      FROM ${fluxo} f
      LEFT JOIN ${vendas} v
        ON v.id_venda = f.id_venda AND v.id_empresa = f.id_empresa
      LEFT JOIN ${clientes} c
        ON c.id_cliente = v.id_cliente AND c.id_empresa = f.id_empresa
      WHERE f.id_transacao = @id AND f.id_empresa = @empresaId
      LIMIT 1
    `,
      { id: idTransacao, empresaId: auth.empresaId },
    );

    if (!parcela) throw new NotFoundException('Conta a receber não encontrada');

    const tipo = (parcela.tipo_movimentacao ?? '').toUpperCase();
    if (!['ENTRADA', 'RECEITA', 'RECEBIMENTO'].includes(tipo)) {
      throw new BadRequestException(
        'Só é possível marcar como recebido uma entrada de caixa',
      );
    }

    const status = (parcela.status_financeiro ?? '').toUpperCase();
    if (['RECEBIDO', 'REALIZADO', 'PAGO'].includes(status)) {
      throw new BadRequestException('Esta parcela já foi marcada como recebida');
    }
    if (status === 'CANCELADO') {
      throw new BadRequestException('Não é possível receber uma parcela cancelada');
    }

    const previsto = roundMoney(Number(parcela.valor_previsto));
    const pago =
      valorRecebido == null ? previsto : roundMoney(Number(valorRecebido));
    if (!(pago > 0)) {
      throw new BadRequestException('Informe um valor pago maior que zero');
    }
    if (pago > previsto + 0.001) {
      throw new BadRequestException(
        'O valor pago não pode ser maior que o saldo em aberto',
      );
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const quitaTudo = pago >= previsto - 0.001;
    const restante = quitaTudo ? 0 : roundMoney(previsto - pago);
    const clienteNome = parcela.cliente?.trim() || null;
    const agora = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      await tx.query(
        `
        UPDATE ${fluxo}
        SET status_financeiro = 'RECEBIDO',
            data_pagamento = @hoje,
            valor_previsto = @pago,
            valor_realizado = @pago,
            id_usuario_alteracao = @userId,
            alterado_em = now()
        WHERE id_transacao = @id AND id_empresa = @empresaId
      `,
        {
          hoje,
          pago,
          userId: auth.userId,
          id: idTransacao,
          empresaId: auth.empresaId,
        },
      );

      if (restante > 0) {
        await tx.insert(fluxo, [
          {
            id_transacao: novoIdFluxo(),
            id_empresa: auth.empresaId,
            tipo_movimentacao: parcela.tipo_movimentacao,
            id_plano_contas: parcela.id_plano_contas,
            id_projeto: parcela.id_projeto,
            data_vencimento: parcela.data_vencimento,
            data_pagamento: null,
            valor_previsto: restante,
            valor_realizado: null,
            metodo_pagamento: null,
            status_financeiro: 'PREVISTO',
            data_competencia: parcela.data_competencia,
            id_despesa_fixa: null,
            id_venda: parcela.id_venda,
            descricao: clienteNome
              ? `Saldo a receber — ${clienteNome}`
              : 'Saldo a receber',
            id_usuario_criacao: auth.userId,
            criado_em: agora,
            id_usuario_alteracao: null,
            alterado_em: null,
            origem: parcela.origem ?? 'CRM_LANCAMENTOS',
          },
        ]);
      }
    });

    const dataBr = hoje.split('-').reverse().join('/');
    return {
      idTransacao,
      dataPagamento: hoje,
      competencia: parcela.data_vencimento,
      valorRecebido: pago,
      valorPendente: restante,
      mensagem: restante > 0
        ? `Recebimento de ${pago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} confirmado em ${dataBr}. Ficam ${restante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a receber.`
        : `Recebimento confirmado em ${dataBr} — entra no caixa do mês`,
    };
  }

  /**
   * Projeção: entradas previstas do próximo mês vs custos fixos.
   * Também calcula ponto de equilíbrio e meta confortável (lucro desejado = 20% dos fixos por padrão).
   */
  async projecaoEMetas(
    empresaId: string,
    mesReferencia = currentMonthUtc(),
    margemSeguranca = 0.2,
  ) {
    const mesProjecao = nextMonth(mesReferencia);
    const resultadoAtual = await this.resultadoMensal(empresaId, mesReferencia);
    const custosFixosProximo = await this.custosFixos(empresaId, mesProjecao);

    const fluxo = this.db.table('fato_fluxo_caixa');

    const sqlEntradas = `
      SELECT COALESCE(SUM(valor_previsto), 0) AS entradas_previstas
      FROM ${fluxo}
      WHERE id_empresa = @empresaId
        AND data_vencimento >= @mesInicio AND data_vencimento < @mesFim
        AND UPPER(tipo_movimentacao) IN ('ENTRADA', 'RECEITA', 'RECEBIMENTO')
        AND UPPER(status_financeiro) <> 'CANCELADO'
    `;

    const [entradasRow] = await this.db.query<{
      entradas_previstas: number;
    }>(sqlEntradas, { empresaId, ...monthRange(mesProjecao) });

    const entradasPrevistas = Number(entradasRow?.entradas_previstas ?? 0);
    const custosFixos = custosFixosProximo.totalPrevisto;
    const margem = resultadoAtual.margemPercentual;
    const pontoEquilibrio = margem > 0 ? custosFixos / margem : null;
    const lucroDesejado = custosFixos * margemSeguranca;
    const metaConfortavel =
      margem > 0 ? (custosFixos + lucroDesejado) / margem : null;

    return {
      mesReferencia,
      mesProjecao,
      entradasPrevistas,
      custosFixosPrevistos: custosFixos,
      cobreCustosFixos: entradasPrevistas >= custosFixos,
      sobraOuFalta: entradasPrevistas - custosFixos,
      margemPercentualBase: margem,
      pontoEquilibrioFaturamento: pontoEquilibrio,
      metaConfortavelFaturamento: metaConfortavel,
      regraMeta: `${Math.round(margemSeguranca * 100)}% dos custos fixos como lucro desejado`,
    };
  }

  /** Painel consolidado para reunião com sócios. */
  async painelSocios(empresaId: string, mes = currentMonthUtc()) {
    const mesAtual = currentMonthUtc();
    const ehProjecao = mes > mesAtual;

    const [
      resultado,
      rentabilidade,
      custosFixos,
      projecao,
      baseMargem,
      fluxoCaixa,
      contasAReceber,
    ] = await Promise.all([
      this.resultadoMensal(empresaId, mes),
      this.rentabilidadeProdutos(empresaId, mes),
      this.custosFixos(empresaId, mes),
      this.projecaoEMetas(empresaId, mes),
      ehProjecao
        ? this.resultadoMensal(empresaId, mesAtual)
        : Promise.resolve(null),
      this.fluxoCaixaMensal(empresaId, mes),
      this.contasAReceber(empresaId, mes),
    ]);

    const custosFixosVigentes = Number(
      custosFixos.totalMensalVigente ?? custosFixos.totalPrevisto ?? 0,
    );
    const margemBase =
      (ehProjecao
        ? baseMargem?.margemPercentual
        : resultado.margemPercentual) ?? 0;
    const lucroDesejado = custosFixosVigentes * 0.2;
    const metaFaturamento =
      margemBase > 0
        ? (custosFixosVigentes + lucroDesejado) / margemBase
        : custosFixosVigentes > 0
          ? custosFixosVigentes
          : null;

    const entradasPrevistas = fluxoCaixa.entradasPrevistas;
    const entradasRecebidas = fluxoCaixa.entradasRecebidas;

    return {
      mes,
      resultado,
      rentabilidade,
      custosFixos,
      projecao,
      fluxoCaixa,
      contasAReceber,
      visaoMes: {
        ehProjecao,
        mes,
        entradasPrevistas,
        entradasRecebidas,
        custosFixosVigentes,
        metaFaturamento,
        pontoEquilibrio:
          margemBase > 0 ? custosFixosVigentes / margemBase : null,
        margemPercentualBase: margemBase,
        cobreCustosFixos: entradasPrevistas >= custosFixosVigentes,
        cobreCustosFixosRecebido: entradasRecebidas >= custosFixosVigentes,
        sobraOuFalta: entradasPrevistas - custosFixosVigentes,
        sobraOuFaltaRecebido: entradasRecebidas - custosFixosVigentes,
        saldoCaixaPrevisto: fluxoCaixa.saldoPrevisto,
        saldoCaixaRealizado: fluxoCaixa.saldoRealizado,
        regraMeta:
          'Meta = custos fixos vigentes + 20% de lucro desejado, com margem do mês atual como base',
        leitura:
          'DRE = o que foi vendido no mês (faturamento). Caixa = o que entrou/saiu de dinheiro no mês — pode ser de vendas de meses anteriores.',
      },
    };
  }
}
