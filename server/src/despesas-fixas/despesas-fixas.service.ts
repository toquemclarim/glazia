import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthContext } from '../auth/auth-context';
import { assertDiretoria } from '../auth/roles';
import { DatabaseService, type Queryable } from '../database/database.service';
import {
  CATEGORIAS_CUSTO_FIXO,
  categoriaIdFromPlanoContas,
  getCategoriaCustoFixo,
  planoContasIdFromCategoria,
} from './categorias';
import {
  type AtualizarDespesaFixaDto,
  type CriarDespesaFixaDto,
} from './dto/despesas-fixas.dto';

type DespesaRow = {
  id_despesa_fixa: string;
  id_empresa: string;
  id_plano_contas: string;
  descricao: string;
  valor_mensal: number;
  dia_vencimento: number;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  observacao: string | null;
};

const CAMPOS = `
  id_despesa_fixa, id_empresa, id_plano_contas, descricao,
  valor_mensal, dia_vencimento, data_inicio, data_fim, ativo, observacao
`;

/** Meses à frente gerados no fluxo quando o custo não tem término. */
const HORIZONTE_MESES_SEM_FIM = 18;

@Injectable()
export class DespesasFixasService implements OnModuleInit {
  private readonly logger = new Logger(DespesasFixasService.name);
  /** YYYY-MM-DD (America/Sao_Paulo) da última rotina do dia 1. */
  private lastRotinaDia1: string | null = null;
  private rotinaTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    void this.talvezRodarInicioMes();
    this.rotinaTimer = setInterval(
      () => void this.talvezRodarInicioMes(),
      60 * 60 * 1000,
    );
  }

  private get tabela() {
    return this.db.table('cad_despesa_fixa');
  }

  private assertDiretoria(auth: AuthContext) {
    assertDiretoria(auth);
  }

  private hojeBrasil(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  /** Todo dia 1: reabre o ciclo mensal (parcelas do mês sem “pago”). */
  private async talvezRodarInicioMes() {
    const hoje = this.hojeBrasil();
    const dia = Number(hoje.slice(8, 10));
    if (dia !== 1) return;
    if (this.lastRotinaDia1 === hoje) return;
    try {
      await this.rotinaInicioMes();
      this.lastRotinaDia1 = hoje;
    } catch (err) {
      this.logger.error(
        `Falha na rotina do dia 1 (${hoje}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Dia 1 do mês:
   * - marca saídas atrasadas como VENCIDO
   * - garante parcela PREVISTO do mês atual para cada custo fixo ativo
   *   (o toggle “Pago” da UI volta a ficar desmarcado no novo ciclo)
   */
  async rotinaInicioMes() {
    const fluxo = this.db.table('fato_fluxo_caixa');
    const vencidas = await this.db.query<{ n: number }>(
      `
      WITH u AS (
        UPDATE ${fluxo}
        SET status_financeiro = 'VENCIDO',
            alterado_em = now()
        WHERE UPPER(tipo_movimentacao) IN ('SAIDA', 'DESPESA', 'PAGAMENTO')
          AND id_despesa_fixa IS NOT NULL
          AND data_vencimento < CURRENT_DATE
          AND UPPER(status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO')
        RETURNING 1
      )
      SELECT count(*)::int AS n FROM u
    `,
    );

    const empresas = await this.db.query<{ id_empresa: string }>(
      `
      SELECT DISTINCT id_empresa
      FROM ${this.tabela}
      WHERE ativo = TRUE
    `,
    );

    let criadas = 0;
    for (const e of empresas) {
      criadas += await this.garantirParcelasMesAtual(e.id_empresa);
    }

    this.logger.log(
      `Rotina dia 1: ${vencidas[0]?.n ?? 0} parcela(s) → VENCIDO · ${criadas} parcela(s) PREVISTO do mês criadas · ${empresas.length} empresa(s)`,
    );
    return { vencidas: vencidas[0]?.n ?? 0, parcelasCriadas: criadas };
  }

  /** Garante parcela do mês corrente (PREVISTO) para custos ativos sem ciclo aberto. */
  async garantirParcelasMesAtual(empresaId: string): Promise<number> {
    const fluxo = this.db.table('fato_fluxo_caixa');
    const faltantes = await this.db.query<DespesaRow>(
      `
      SELECT ${CAMPOS}
      FROM ${this.tabela} d
      WHERE d.id_empresa = @empresaId
        AND d.ativo = TRUE
        AND d.data_inicio < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
        AND (d.data_fim IS NULL OR d.data_fim >= date_trunc('month', CURRENT_DATE)::date)
        AND NOT EXISTS (
          SELECT 1
          FROM ${fluxo} f
          WHERE f.id_empresa = d.id_empresa
            AND f.id_despesa_fixa = d.id_despesa_fixa
            AND f.data_vencimento >= date_trunc('month', CURRENT_DATE)::date
            AND f.data_vencimento < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
            AND UPPER(f.status_financeiro) <> 'CANCELADO'
        )
    `,
      { empresaId },
    );

    if (!faltantes.length) return 0;

    const agora = new Date().toISOString();
    const rows = faltantes.map((d) => {
      const dia = Math.min(Math.max(Number(d.dia_vencimento), 1), 28);
      const ymd = this.hojeBrasil();
      const [y, m] = ymd.split('-');
      const dataVenc = `${y}-${m}-${String(dia).padStart(2, '0')}`;
      return {
        id_transacao: `flx_${randomUUID().replace(/-/g, '').slice(0, 18)}`,
        id_empresa: empresaId,
        tipo_movimentacao: 'SAIDA',
        id_plano_contas: d.id_plano_contas,
        id_projeto: null,
        data_vencimento: dataVenc,
        data_pagamento: null,
        valor_previsto: d.valor_mensal,
        valor_realizado: null,
        metodo_pagamento: null,
        status_financeiro: 'PREVISTO',
        data_competencia: dataVenc,
        id_despesa_fixa: d.id_despesa_fixa,
        id_venda: null,
        descricao: d.descricao,
        id_usuario_criacao: 'system-rotina-mes',
        criado_em: agora,
        id_usuario_alteracao: null,
        alterado_em: null,
        origem: 'RECORRENCIA',
      };
    });

    await this.db.insert(fluxo, rows);
    return rows.length;
  }

  listarCategorias() {
    return {
      itens: CATEGORIAS_CUSTO_FIXO.map((c) => ({
        id: c.id,
        label: c.label,
        categoria: c.categoria,
        subcategoria: c.subcategoria,
      })),
    };
  }

  async listar(auth: AuthContext) {
    assertDiretoria(auth);
    await this.garantirParcelasMesAtual(auth.empresaId);
    void this.talvezRodarInicioMes();
    const rows = await this.db.query<
      DespesaRow & {
        proxima_parcela_id: string | null;
        proxima_parcela_vencimento: string | null;
        proxima_parcela_status: string | null;
        parcela_mes_atual_status: string | null;
        parcela_mes_atual_id: string | null;
        qtd_pagamentos: number;
        ultimo_pagamento: string | null;
        parcela_ciclo_paga_id: string | null;
        parcela_ciclo_paga_vencimento: string | null;
        parcela_ciclo_paga_em: string | null;
      }
    >(
      `
      SELECT
        d.id_despesa_fixa, d.id_empresa, d.id_plano_contas, d.descricao,
        d.valor_mensal, d.dia_vencimento, d.data_inicio, d.data_fim, d.ativo,
        d.observacao,
        prox.id_transacao AS proxima_parcela_id,
        prox.data_vencimento AS proxima_parcela_vencimento,
        prox.status_financeiro AS proxima_parcela_status,
        mes.id_transacao AS parcela_mes_atual_id,
        mes.status_financeiro AS parcela_mes_atual_status,
        COALESCE(hist.qtd, 0) AS qtd_pagamentos,
        hist.ultimo AS ultimo_pagamento,
        paga_ciclo.id_transacao AS parcela_ciclo_paga_id,
        paga_ciclo.data_vencimento AS parcela_ciclo_paga_vencimento,
        paga_ciclo.data_pagamento AS parcela_ciclo_paga_em
      FROM ${this.tabela} d
      LEFT JOIN LATERAL (
        SELECT f.id_transacao, f.data_vencimento, f.status_financeiro
        FROM ${this.db.table('fato_fluxo_caixa')} f
        WHERE f.id_despesa_fixa = d.id_despesa_fixa
          AND f.id_empresa = d.id_empresa
          AND UPPER(f.status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
          AND f.data_vencimento >= CURRENT_DATE
        ORDER BY f.data_vencimento
        LIMIT 1
      ) prox ON TRUE
      LEFT JOIN LATERAL (
        SELECT f.id_transacao, f.status_financeiro
        FROM ${this.db.table('fato_fluxo_caixa')} f
        WHERE f.id_despesa_fixa = d.id_despesa_fixa
          AND f.id_empresa = d.id_empresa
          AND UPPER(f.status_financeiro) <> 'CANCELADO'
          AND f.data_vencimento >= date_trunc('month', CURRENT_DATE)::date
          AND f.data_vencimento < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
        ORDER BY f.data_vencimento
        LIMIT 1
      ) mes ON TRUE
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS qtd, max(h.data_pagamento)::text AS ultimo
        FROM ${this.db.table('hist_pagamento_despesa_fixa')} h
        WHERE h.id_despesa_fixa = d.id_despesa_fixa
          AND h.id_empresa = d.id_empresa
      ) hist ON TRUE
      LEFT JOIN LATERAL (
        SELECT f.id_transacao, f.data_vencimento, f.data_pagamento
        FROM ${this.db.table('fato_fluxo_caixa')} f
        WHERE f.id_despesa_fixa = d.id_despesa_fixa
          AND f.id_empresa = d.id_empresa
          AND UPPER(f.status_financeiro) = 'PAGO'
          AND f.data_pagamento = CURRENT_DATE
        ORDER BY f.data_vencimento DESC
        LIMIT 1
      ) paga_ciclo ON TRUE
      WHERE d.id_empresa = @empresaId AND d.ativo = TRUE
      ORDER BY d.valor_mensal DESC, d.descricao
    `,
      { empresaId: auth.empresaId },
    );

    const itens = rows.map((r) => {
      const parcelaMesAtualPaga =
        (r.parcela_mes_atual_status ?? '').toUpperCase() === 'PAGO';
      const pagoHoje = Boolean(r.parcela_ciclo_paga_id);
      return {
        ...this.toDto(r),
        proximaParcela: r.proxima_parcela_id
          ? {
              idTransacao: r.proxima_parcela_id,
              dataVencimento: r.proxima_parcela_vencimento,
              status: r.proxima_parcela_status,
            }
          : null,
        parcelaMesAtualPaga,
        parcelaMesAtualId: r.parcela_mes_atual_id,
        qtdPagamentos: Number(r.qtd_pagamentos ?? 0),
        ultimoPagamento: r.ultimo_pagamento,
        pagoHoje,
        ultimaParcelaPagaHoje: r.parcela_ciclo_paga_id
          ? {
              idTransacao: r.parcela_ciclo_paga_id,
              dataVencimento: r.parcela_ciclo_paga_vencimento,
              dataPagamento: r.parcela_ciclo_paga_em,
            }
          : null,
      };
    });

    return {
      itens,
      totalMensal: itens.reduce((s, d) => s + d.valorMensal, 0),
      maiorCusto: itens[0] ?? null,
    };
  }

  /** Contas fixas vencidas em aberto + a vencer nos próximos N dias. */
  async proximosVencimentos(auth: AuthContext, dias = 5) {
    assertDiretoria(auth);
    await this.garantirParcelasMesAtual(auth.empresaId);
    const hoje = this.hojeBrasil();
    const rows = await this.db.query<{
      id_transacao: string;
      id_despesa_fixa: string;
      descricao: string;
      data_vencimento: string;
      valor_previsto: number;
      status_financeiro: string;
      dia_vencimento: number;
    }>(
      `
      SELECT
        f.id_transacao,
        f.id_despesa_fixa,
        COALESCE(f.descricao, d.descricao) AS descricao,
        f.data_vencimento::text AS data_vencimento,
        f.valor_previsto,
        f.status_financeiro,
        d.dia_vencimento
      FROM ${this.db.table('fato_fluxo_caixa')} f
      INNER JOIN ${this.tabela} d
        ON d.id_despesa_fixa = f.id_despesa_fixa
       AND d.id_empresa = f.id_empresa
      WHERE f.id_empresa = @empresaId
        AND d.ativo = TRUE
        AND f.id_despesa_fixa IS NOT NULL
        AND UPPER(f.status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
        AND (
          f.data_vencimento < CURRENT_DATE
          OR (
            f.data_vencimento >= CURRENT_DATE
            AND f.data_vencimento < CURRENT_DATE + (@dias::int)
          )
        )
      ORDER BY f.data_vencimento, f.valor_previsto DESC
    `,
      { empresaId: auth.empresaId, dias },
    );

    return {
      dias,
      itens: rows.map((r) => {
        const dataVencimento = r.data_vencimento.slice(0, 10);
        return {
          idTransacao: r.id_transacao,
          idDespesaFixa: r.id_despesa_fixa,
          descricao: r.descricao,
          dataVencimento,
          valor: Number(r.valor_previsto),
          status: r.status_financeiro,
          diaVencimento: Number(r.dia_vencimento),
          vencida: dataVencimento < hoje,
        };
      }),
      total: rows.reduce((s, r) => s + Number(r.valor_previsto), 0),
    };
  }

  async historicoPagamentos(auth: AuthContext, idDespesa: string) {
    assertDiretoria(auth);
    const [despesa] = await this.db.query<DespesaRow>(
      `
      SELECT ${CAMPOS}
      FROM ${this.tabela}
      WHERE id_despesa_fixa = @id AND id_empresa = @empresaId
      LIMIT 1
    `,
      { id: idDespesa, empresaId: auth.empresaId },
    );
    if (!despesa) throw new NotFoundException('Custo fixo não encontrado');

    const rows = await this.db.query<{
      id_pagamento: string;
      data_pagamento: string;
      competencia: string;
      valor_pago: number;
      id_usuario: string | null;
      observacao: string | null;
      criado_em: string;
    }>(
      `
      SELECT
        id_pagamento, data_pagamento, competencia, valor_pago,
        id_usuario, observacao, criado_em
      FROM ${this.db.table('hist_pagamento_despesa_fixa')}
      WHERE id_empresa = @empresaId AND id_despesa_fixa = @id
      ORDER BY data_pagamento DESC, criado_em DESC
    `,
      { empresaId: auth.empresaId, id: idDespesa },
    );

    return {
      despesa: this.toDto(despesa),
      itens: rows.map((r) => ({
        id: r.id_pagamento,
        dataPagamento: r.data_pagamento,
        competencia: r.competencia,
        valorPago: Number(r.valor_pago),
        idUsuario: r.id_usuario,
        observacao: r.observacao,
        criadoEm: r.criado_em,
      })),
    };
  }

  /**
   * Diretor/ADM sinaliza a próxima parcela em aberto como paga.
   * Usa a mesma regra da UI (vencimento >= hoje), ou a parcela informada.
   */
  async marcarPago(
    auth: AuthContext,
    idDespesa: string,
    idTransacao?: string,
  ) {
    this.assertDiretoria(auth);

    return this.db.transaction(async (tx) => {
      const [despesa] = await tx.query<DespesaRow>(
        `
        SELECT ${CAMPOS}
        FROM ${this.tabela}
        WHERE id_despesa_fixa = @id AND id_empresa = @empresaId AND ativo = TRUE
        LIMIT 1
      `,
        { id: idDespesa, empresaId: auth.empresaId },
      );
      if (!despesa) throw new NotFoundException('Custo fixo não encontrado');

      const [parcela] = await tx.query<{
        id_transacao: string;
        data_vencimento: string;
        valor_previsto: number;
        status_financeiro: string;
      }>(
        idTransacao
          ? `
        SELECT id_transacao, data_vencimento, valor_previsto, status_financeiro
        FROM ${this.db.table('fato_fluxo_caixa')}
        WHERE id_empresa = @empresaId
          AND id_despesa_fixa = @id
          AND id_transacao = @idTransacao
          AND UPPER(status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
        LIMIT 1
      `
          : `
        SELECT id_transacao, data_vencimento, valor_previsto, status_financeiro
        FROM ${this.db.table('fato_fluxo_caixa')}
        WHERE id_empresa = @empresaId
          AND id_despesa_fixa = @id
          AND UPPER(status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
          AND data_vencimento >= CURRENT_DATE
        ORDER BY data_vencimento
        LIMIT 1
      `,
        {
          empresaId: auth.empresaId,
          id: idDespesa,
          idTransacao: idTransacao ?? null,
        },
      );

      if (!parcela) {
        throw new BadRequestException(
          'Não há parcela em aberto para este custo fixo',
        );
      }

      const hoje = new Date().toISOString().slice(0, 10);
      const idPagamento = `pag_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

      const updated = await tx.query<{ id_transacao: string }>(
        `
        UPDATE ${this.db.table('fato_fluxo_caixa')}
        SET status_financeiro = 'PAGO',
            data_pagamento = @hoje,
            valor_realizado = @valor,
            id_usuario_alteracao = @userId,
            alterado_em = now()
        WHERE id_transacao = @idTransacao
          AND id_empresa = @empresaId
          AND UPPER(status_financeiro) IN ('PREVISTO', 'PENDENTE', 'ABERTO', 'VENCIDO')
        RETURNING id_transacao
      `,
        {
          hoje,
          valor: parcela.valor_previsto,
          userId: auth.userId,
          idTransacao: parcela.id_transacao,
          empresaId: auth.empresaId,
        },
      );

      if (!updated.length) {
        throw new BadRequestException(
          'A parcela já foi paga ou não está mais disponível',
        );
      }

      await tx.query(
        `
        INSERT INTO ${this.db.table('hist_pagamento_despesa_fixa')} (
          id_pagamento, id_empresa, id_despesa_fixa, id_transacao,
          data_pagamento, competencia, valor_pago, id_usuario, observacao, criado_em
        ) VALUES (
          @idPagamento, @empresaId, @idDespesa, @idTransacao,
          @hoje, @competencia, @valor, @userId, NULL, now()
        )
        ON CONFLICT (id_pagamento) DO NOTHING
      `,
        {
          idPagamento,
          empresaId: auth.empresaId,
          idDespesa,
          idTransacao: parcela.id_transacao,
          hoje,
          competencia: parcela.data_vencimento,
          valor: parcela.valor_previsto,
          userId: auth.userId,
        },
      );

      this.logger.log(
        `Pagamento ${idPagamento} · despesa ${idDespesa} · parcela ${parcela.id_transacao} · ${hoje}`,
      );

      return {
        idPagamento,
        idDespesaFixa: idDespesa,
        idTransacao: parcela.id_transacao,
        dataPagamento: hoje,
        competencia: parcela.data_vencimento,
        valorPago: Number(parcela.valor_previsto),
        mensagem: `${despesa.descricao} marcada como paga em ${hoje.split('-').reverse().join('/')}`,
      };
    });
  }

  /**
   * Template enxuto de vidraçaria — valores ilustrativos para o Diretor ajustar.
   * Usado no provisionamento Platform Ops.
   */
  async seedTemplateVidracaria(auth: AuthContext) {
    this.assertDiretoria(auth);
    const hoje = new Date().toISOString().slice(0, 10);
    const templates: CriarDespesaFixaDto[] = [
      {
        descricao: 'Aluguel do galpão',
        categoriaId: 'estrutura',
        valorMensal: 3500,
        diaVencimento: 10,
        dataInicio: hoje,
        semTermino: true,
        observacao: 'Seed inicial Glazia — ajuste o valor real',
      },
      {
        descricao: 'Energia elétrica',
        categoriaId: 'utilidades',
        valorMensal: 850,
        diaVencimento: 15,
        dataInicio: hoje,
        semTermino: true,
        observacao: 'Seed inicial Glazia — ajuste o valor real',
      },
      {
        descricao: 'Internet / telefonia',
        categoriaId: 'utilidades',
        valorMensal: 180,
        diaVencimento: 12,
        dataInicio: hoje,
        semTermino: true,
      },
      {
        descricao: 'Sistema / software',
        categoriaId: 'software',
        valorMensal: 297,
        diaVencimento: 5,
        dataInicio: hoje,
        semTermino: true,
      },
      {
        descricao: 'Seguro patrimonial',
        categoriaId: 'seguros',
        valorMensal: 220,
        diaVencimento: 20,
        dataInicio: hoje,
        semTermino: true,
      },
    ];

    const criados = [];
    for (const item of templates) {
      criados.push(await this.criar(auth, item));
    }
    return { quantidade: criados.length, itens: criados };
  }

  async criar(auth: AuthContext, dto: CriarDespesaFixaDto) {
    this.assertDiretoria(auth);
    this.validarVigencia(dto.semTermino, dto.dataInicio, dto.dataFim);

    const cat = getCategoriaCustoFixo(dto.categoriaId);
    if (!cat) throw new BadRequestException('Categoria inválida');

    const row: DespesaRow = {
      id_despesa_fixa: `df_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      id_empresa: auth.empresaId,
      id_plano_contas: planoContasIdFromCategoria(cat.id),
      descricao: dto.descricao.trim(),
      valor_mensal: dto.valorMensal,
      dia_vencimento: dto.diaVencimento,
      data_inicio: dto.dataInicio,
      data_fim: dto.semTermino ? null : (dto.dataFim ?? null),
      ativo: true,
      observacao: dto.observacao?.trim() || null,
    };

    // Cadastro e previsões no fluxo precisam nascer juntos.
    await this.db.transaction(async (tx) => {
      await this.ensurePlanoContas(tx, auth.empresaId, cat.id);
      await tx.insert(this.tabela, [
        {
          ...row,
          id_usuario_criacao: auth.userId,
          criado_em: new Date().toISOString(),
        },
      ]);
      await this.syncFluxoParaDespesa(tx, auth, row);
    });

    return {
      ...this.toDto(row),
      mensagem: 'Custo fixo cadastrado e previsto no fluxo de caixa',
    };
  }

  async atualizar(auth: AuthContext, id: string, dto: AtualizarDespesaFixaDto) {
    this.assertDiretoria(auth);

    return this.db.transaction(async (tx) => {
      const [atual] = await tx.query<DespesaRow>(
        `
        SELECT ${CAMPOS}
        FROM ${this.tabela}
        WHERE id_despesa_fixa = @id AND id_empresa = @empresaId AND ativo = TRUE
        FOR UPDATE
      `,
        { id, empresaId: auth.empresaId },
      );
      if (!atual) throw new NotFoundException('Custo fixo não encontrado');

      const semTermino = dto.semTermino ?? atual.data_fim == null;
      const dataInicio = dto.dataInicio ?? atual.data_inicio;
      const dataFim = semTermino
        ? null
        : dto.dataFim !== undefined
          ? dto.dataFim
          : atual.data_fim;

      this.validarVigencia(semTermino, dataInicio, dataFim ?? undefined);

      let idPlano = atual.id_plano_contas;
      if (dto.categoriaId) {
        const cat = getCategoriaCustoFixo(dto.categoriaId);
        if (!cat) throw new BadRequestException('Categoria inválida');
        await this.ensurePlanoContas(tx, auth.empresaId, cat.id);
        idPlano = planoContasIdFromCategoria(cat.id);
      }

      const updated: DespesaRow = {
        ...atual,
        descricao: dto.descricao?.trim() ?? atual.descricao,
        id_plano_contas: idPlano,
        valor_mensal: dto.valorMensal ?? atual.valor_mensal,
        dia_vencimento: dto.diaVencimento ?? atual.dia_vencimento,
        data_inicio: dataInicio,
        data_fim: dataFim,
        observacao:
          dto.observacao === undefined
            ? atual.observacao
            : dto.observacao?.trim() || null,
      };

      await tx.update(
        this.tabela,
        {
          descricao: updated.descricao,
          id_plano_contas: updated.id_plano_contas,
          valor_mensal: updated.valor_mensal,
          dia_vencimento: updated.dia_vencimento,
          data_inicio: updated.data_inicio,
          data_fim: updated.data_fim,
          observacao: updated.observacao,
          id_usuario_alteracao: auth.userId,
          alterado_em: new Date().toISOString(),
        },
        { id_despesa_fixa: id, id_empresa: auth.empresaId },
      );

      await this.syncFluxoParaDespesa(tx, auth, updated);

      return {
        ...this.toDto(updated),
        mensagem: 'Custo fixo atualizado',
      };
    });
  }

  async remover(auth: AuthContext, id: string) {
    this.assertDiretoria(auth);

    return this.db.transaction(async (tx) => {
      const alteradas = await tx.update(
        this.tabela,
        {
          ativo: false,
          id_usuario_alteracao: auth.userId,
          alterado_em: new Date().toISOString(),
        },
        { id_despesa_fixa: id, id_empresa: auth.empresaId, ativo: true },
      );
      if (!alteradas) throw new NotFoundException('Custo fixo não encontrado');

      await this.cancelarFluxoFuturo(tx, auth.empresaId, id);

      return { mensagem: 'Custo fixo removido', id };
    });
  }

  private validarVigencia(
    semTermino: boolean,
    dataInicio: string,
    dataFim?: string,
  ) {
    if (!semTermino) {
      if (!dataFim) {
        throw new BadRequestException(
          'Informe a data de término ou marque como sem fim',
        );
      }
      if (dataFim < dataInicio) {
        throw new BadRequestException(
          'A data de término deve ser igual ou posterior ao início',
        );
      }
    }
  }

  private toDto(row: DespesaRow) {
    const categoriaId = categoriaIdFromPlanoContas(row.id_plano_contas);
    const cat = categoriaId ? getCategoriaCustoFixo(categoriaId) : undefined;
    return {
      id: row.id_despesa_fixa,
      descricao: row.descricao,
      categoriaId: categoriaId ?? 'outros',
      categoriaLabel: cat?.label ?? 'Outros custos fixos',
      categoria: cat?.categoria ?? row.id_plano_contas,
      subcategoria: cat?.subcategoria ?? null,
      valorMensal: Number(row.valor_mensal),
      diaVencimento: Number(row.dia_vencimento),
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      semTermino: row.data_fim == null,
      observacao: row.observacao,
      ativo: row.ativo,
    };
  }

  private async ensurePlanoContas(
    tx: Queryable,
    empresaId: string,
    categoriaId: string,
  ) {
    const cat = getCategoriaCustoFixo(categoriaId);
    if (!cat) throw new BadRequestException('Categoria inválida');
    const idConta = planoContasIdFromCategoria(categoriaId);

    await tx.query(
      `
      INSERT INTO ${this.db.table('dim_plano_contas')}
        (id_conta, id_empresa, tipo_conta, categoria, subcategoria)
      VALUES (@idConta, @empresaId, 'DESPESA FIXA', @categoria, @subcategoria)
      ON CONFLICT (id_conta) DO NOTHING
    `,
      {
        idConta,
        empresaId,
        categoria: cat.categoria,
        subcategoria: cat.subcategoria,
      },
    );

    return idConta;
  }

  /** Regera as previsões mensais no fluxo de caixa a partir da vigência. */
  private async syncFluxoParaDespesa(
    tx: Queryable,
    auth: AuthContext,
    despesa: DespesaRow,
  ) {
    await this.cancelarFluxoFuturo(tx, auth.empresaId, despesa.id_despesa_fixa);

    // Só regenera parcelas futuras — histórico (vencido/pago) permanece intacto.
    const hoje = new Date().toISOString().slice(0, 10);
    const datas = this.gerarDatasVencimento(despesa).filter((d) => d >= hoje);
    if (!datas.length) return;

    const agora = new Date().toISOString();
    const rows = datas.map((dataVenc) => ({
      id_transacao: `flx_${randomUUID().replace(/-/g, '').slice(0, 18)}`,
      id_empresa: auth.empresaId,
      tipo_movimentacao: 'SAIDA',
      id_plano_contas: despesa.id_plano_contas,
      id_projeto: null,
      data_vencimento: dataVenc,
      data_pagamento: null,
      valor_previsto: despesa.valor_mensal,
      valor_realizado: null,
      metodo_pagamento: null,
      status_financeiro: 'PREVISTO',
      data_competencia: dataVenc,
      id_despesa_fixa: despesa.id_despesa_fixa,
      id_venda: null,
      descricao: despesa.descricao,
      id_usuario_criacao: auth.userId,
      criado_em: agora,
      id_usuario_alteracao: null,
      alterado_em: null,
      origem: 'RECORRENCIA',
    }));

    await tx.insert(this.db.table('fato_fluxo_caixa'), rows);
    this.logger.log(
      `Fluxo: ${rows.length} parcela(s) para ${despesa.id_despesa_fixa}`,
    );
  }

  /** Parcelas já vencidas ou pagas são histórico e não podem ser mexidas. */
  private async cancelarFluxoFuturo(
    tx: Queryable,
    empresaId: string,
    idDespesa: string,
  ) {
    await tx.query(
      `
      UPDATE ${this.db.table('fato_fluxo_caixa')}
      SET status_financeiro = 'CANCELADO',
          alterado_em = now()
      WHERE id_empresa = @empresaId
        AND id_despesa_fixa = @idDespesa
        AND data_vencimento >= CURRENT_DATE
        AND UPPER(status_financeiro) IN ('PREVISTO', 'PENDENTE')
    `,
      { empresaId, idDespesa },
    );
  }

  private gerarDatasVencimento(despesa: DespesaRow): string[] {
    const inicio = despesa.data_inicio;
    let fim: string;
    if (despesa.data_fim) {
      fim = despesa.data_fim;
    } else {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() + HORIZONTE_MESES_SEM_FIM);
      fim = d.toISOString().slice(0, 10);
    }

    const datas: string[] = [];
    const cursor = new Date(`${inicio}T12:00:00Z`);
    const end = new Date(`${fim}T12:00:00Z`);
    const dia = Math.min(Math.max(despesa.dia_vencimento, 1), 28);

    // Alinha ao mês de início
    cursor.setUTCDate(1);

    while (cursor <= end) {
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth();
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      if (dateStr >= inicio && dateStr <= fim) {
        datas.push(dateStr);
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return datas;
  }
}
