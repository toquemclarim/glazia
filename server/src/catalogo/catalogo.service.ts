import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  CatalogoCoresQueryDto,
  CatalogoCustosQueryDto,
  CatalogoProdutosQueryDto,
} from './dto/catalogo-query.dto';
import { COR_SENTINELA } from '../lancamentos/cores-item';

/** Escapa curingas para que a busca livre trate % e _ como texto comum. */
function likeContains(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

@Injectable()
export class CatalogoService {
  constructor(private readonly db: DatabaseService) {}

  async listarLinhas() {
    const produtos = this.db.catalogTable('ctl_produtos');
    const linhas = this.db.catalogTable('dim_linha');
    const rows = await this.db.query<{
      linha: string;
      qtd: number;
      cor_principal: string | null;
    }>(`
      SELECT
        p.linha,
        COUNT(*) FILTER (WHERE p.cor IS DISTINCT FROM '${COR_SENTINELA}') AS qtd,
        COALESCE(MAX(l.cor_principal), 'PERGUNTAR') AS cor_principal
      FROM ${produtos} p
      LEFT JOIN ${linhas} l ON l.codigo = p.linha
      WHERE p.ativo = TRUE
      GROUP BY p.linha
      ORDER BY p.linha
    `);
    let cores: Record<'PERFIL' | 'VIDRO' | 'ACESSORIO', string[]> | undefined;
    try {
      cores = await this.agruparCoresDim();
    } catch {
      cores = undefined;
    }

    return {
      itens: rows.map((r) => ({
        linha: r.linha,
        quantidadeSkus: Number(r.qtd),
        corPrincipal: (r.cor_principal || 'PERGUNTAR').toUpperCase(),
      })),
      cores,
    };
  }

  /** Cores de dim_cor já agrupadas — evita 3 GETs extras no lançamento. */
  async agruparCoresDim() {
    const table = this.db.catalogTable('dim_cor');
    const rows = await this.db.query<{
      codigo: string;
      aplicavel_a: string;
    }>(`
      SELECT codigo, aplicavel_a
      FROM ${table}
      WHERE ativo = TRUE
        AND codigo IS DISTINCT FROM '${COR_SENTINELA}'
      ORDER BY nome
    `);
    const ambos: string[] = [];
    const porTipo: Record<string, string[]> = {
      PERFIL: [],
      VIDRO: [],
      ACESSORIO: [],
    };
    for (const r of rows) {
      const tipo = (r.aplicavel_a || '').toUpperCase();
      if (tipo === 'AMBOS') ambos.push(r.codigo);
      else if (porTipo[tipo]) porTipo[tipo].push(r.codigo);
    }
    const uniq = (xs: string[]) =>
      [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return {
      PERFIL: uniq([...porTipo.PERFIL, ...ambos]),
      VIDRO: uniq([...porTipo.VIDRO, ...ambos]),
      ACESSORIO: uniq([...porTipo.ACESSORIO, ...ambos]),
    };
  }

  async listarProdutos(query: CatalogoProdutosQueryDto) {
    const table = this.db.catalogTable('ctl_produtos');
    const params: Record<string, unknown> = {};
    const filters = ['ativo = TRUE'];

    if (query.linha) {
      filters.push('UPPER(linha) = UPPER(@linha)');
      params.linha = query.linha;
    }
    if (query.produto) {
      filters.push('UPPER(produto) = UPPER(@produto)');
      params.produto = query.produto;
    }
    if (query.q) {
      filters.push(
        `(produto ILIKE @q OR linha ILIKE @q OR cor ILIKE @q OR COALESCE(descricao, '') ILIKE @q)`,
      );
      params.q = likeContains(query.q);
    }

    const rows = await this.db.query<{
      id_produto: number;
      linha: string;
      produto: string;
      cor: string;
      categoria: string;
      descricao: string | null;
      unidade_venda: string;
    }>(
      `
      SELECT id_produto, linha, produto, cor, categoria, descricao, unidade_venda
      FROM ${table}
      WHERE ${filters.join(' AND ')}
      ORDER BY linha, produto, cor
      LIMIT 5000
    `,
      params,
    );

    const produtosDistintos = [...new Set(rows.map((r) => r.produto))].sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    );
    const coresDistintas = [
      ...new Set(
        rows
          .filter((r) => r.cor !== COR_SENTINELA)
          .map((r) => r.cor),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
      produtosDisponiveis: produtosDistintos,
      coresDisponiveis: coresDistintas,
      itens: rows.map((r) => ({
        idProduto: Number(r.id_produto),
        idProdutoAnalytics: `ctl_${r.id_produto}`,
        linha: r.linha,
        produto: r.produto,
        cor: r.cor,
        categoria: r.categoria,
        descricao: r.descricao,
        unidadeVenda: r.unidade_venda || 'UN',
        rotulo: `${r.produto} · ${r.linha} · ${r.cor}`,
      })),
    };
  }

  async listarCores(query: CatalogoCoresQueryDto) {
    const table = this.db.catalogTable('dim_cor');
    const aplicavel = (query.aplicavelA ?? '').trim().toUpperCase();
    const params: Record<string, unknown> = {};
    const filters = ['ativo = TRUE', `codigo IS DISTINCT FROM '${COR_SENTINELA}'`];
    if (aplicavel && aplicavel !== 'AMBOS') {
      filters.push(
        '(UPPER(aplicavel_a) = UPPER(@aplicavelA) OR UPPER(aplicavel_a) = \'AMBOS\')',
      );
      params.aplicavelA = aplicavel;
    }
    const rows = await this.db.query<{ codigo: string; nome: string }>(
      `
      SELECT codigo, nome
      FROM ${table}
      WHERE ${filters.join(' AND ')}
      ORDER BY nome
    `,
      params,
    );
    return {
      itens: rows.map((r) => ({ codigo: r.codigo, nome: r.nome })),
    };
  }

  async listarTiposCusto() {
    const table = this.db.catalogTable('ctl_custos');
    const rows = await this.db.query<{ tipo_custo: string; qtd: number }>(`
      SELECT tipo_custo, COUNT(*) AS qtd
      FROM ${table}
      WHERE ativo = TRUE
      GROUP BY tipo_custo
      ORDER BY tipo_custo
    `);
    return {
      itens: rows.map((r) => ({
        tipoCusto: r.tipo_custo,
        quantidade: Number(r.qtd),
      })),
    };
  }

  /** Linhas distintas de custo (cascata Tipo → Linha → Item). */
  async listarLinhasCusto(tipoCusto?: string) {
    const table = this.db.catalogTable('ctl_custos');
    const params: Record<string, unknown> = {};
    const filters = ['ativo = TRUE', 'linha IS NOT NULL'];
    if (tipoCusto) {
      filters.push('UPPER(tipo_custo) = UPPER(@tipoCusto)');
      params.tipoCusto = tipoCusto;
    }
    const rows = await this.db.query<{ linha: string; qtd: number }>(
      `
      SELECT linha, COUNT(*) AS qtd
      FROM ${table}
      WHERE ${filters.join(' AND ')}
      GROUP BY linha
      ORDER BY linha
    `,
      params,
    );
    return {
      itens: rows.map((r) => ({
        linha: r.linha,
        quantidade: Number(r.qtd),
      })),
    };
  }

  async listarCustos(query: CatalogoCustosQueryDto) {
    const table = this.db.catalogTable('ctl_custos');
    const params: Record<string, unknown> = {};
    const filters = ['ativo = TRUE'];

    if (query.tipoCusto) {
      filters.push('UPPER(tipo_custo) = UPPER(@tipoCusto)');
      params.tipoCusto = query.tipoCusto;
    }
    if (query.linha) {
      filters.push('(linha IS NULL OR UPPER(linha) = UPPER(@linha))');
      params.linha = query.linha;
    }
    if (query.idProduto) {
      const numeric = Number(String(query.idProduto).replace(/^ctl_/, ''));
      if (!Number.isNaN(numeric)) {
        filters.push('(id_produto IS NULL OR id_produto = @idProdutoNum)');
        params.idProdutoNum = numeric;
      }
    }
    if (query.q) {
      filters.push(
        `(descricao ILIKE @q OR COALESCE(espessura, '') ILIKE @q OR COALESCE(tipo_custo, '') ILIKE @q)`,
      );
      params.q = likeContains(query.q);
    }

    const rows = await this.db.query<{
      id_custo: number;
      id_produto: number | null;
      tipo_custo: string;
      descricao: string;
      linha: string | null;
      produto: string | null;
      cor: string | null;
      espessura: string | null;
      tipo_vidro: string | null;
      unidade_custo: string;
    }>(
      `
      SELECT
        id_custo, id_produto, tipo_custo, descricao,
        linha, produto, cor, espessura, tipo_vidro, unidade_custo
      FROM ${table}
      WHERE ${filters.join(' AND ')}
      ORDER BY tipo_custo, descricao
      LIMIT 10000
    `,
      params,
    );

    return {
      itens: rows.map((r) => ({
        idCusto: Number(r.id_custo),
        idProdutoCatalogo: r.id_produto == null ? null : Number(r.id_produto),
        tipoCusto: r.tipo_custo,
        descricao: r.descricao,
        linha: r.linha,
        produto: r.produto,
        cor: r.cor,
        espessura: r.espessura,
        tipoVidro: r.tipo_vidro,
        unidadeCusto: r.unidade_custo || 'UN',
        rotulo: [r.descricao, r.espessura, r.linha, r.cor]
          .filter(Boolean)
          .join(' · '),
      })),
    };
  }
}
