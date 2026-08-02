import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, types, type PoolClient } from 'pg';
import type { Environment } from '../config/env';

/**
 * numeric e int8 chegam como string por padrão no driver. O domínio do Glazia
 * é financeiro de pequeno porte, então converter para number mantém o mesmo
 * comportamento que os services já esperavam do cliente BigQuery.
 */
types.setTypeParser(types.builtins.NUMERIC, (v) => Number(v));
types.setTypeParser(types.builtins.INT8, (v) => Number(v));
/** DATE volta como 'YYYY-MM-DD', sem fuso, evitando deslocar competência. */
types.setTypeParser(types.builtins.DATE, (v) => v);

export type QueryParams = Record<string, unknown>;

export interface Queryable {
  query<T extends Record<string, unknown>>(
    sql: string,
    params?: QueryParams,
  ): Promise<T[]>;
  insert(table: string, rows: Record<string, unknown>[]): Promise<void>;
  update(
    table: string,
    values: Record<string, unknown>,
    where: Record<string, unknown>,
  ): Promise<number>;
  remove(table: string, where: Record<string, unknown>): Promise<number>;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy, Queryable {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  readonly schema: string;
  readonly catalogSchema: string;

  constructor(private readonly config: ConfigService<Environment, true>) {
    this.schema = this.config.get('DB_SCHEMA', { infer: true });
    this.catalogSchema = this.config.get('DB_CATALOG_SCHEMA', { infer: true });

    const rejectUnauthorized = this.config.get(
      'DATABASE_SSL_REJECT_UNAUTHORIZED',
      { infer: true },
    );

    this.pool = new Pool({
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
      max: this.config.get('DB_POOL_MAX', { infer: true }),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      application_name: 'glazia-api',
      ssl: { rejectUnauthorized },
    });

    this.pool.on('error', (error) => {
      this.logger.error(`Conexão ociosa caiu: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /** Tabela do schema operacional (dimensões e fatos). */
  table(name: string): string {
    return `${this.schema}.${name}`;
  }

  /** Tabela do catálogo (opções do CRUD). */
  catalogTable(name: string): string {
    return `${this.catalogSchema}.${name}`;
  }

  async query<T extends Record<string, unknown>>(
    sql: string,
    params: QueryParams = {},
  ): Promise<T[]> {
    return this.runQuery<T>(this.pool, sql, params);
  }

  async insert(
    table: string,
    rows: Record<string, unknown>[],
    client?: Queryable,
  ): Promise<void> {
    if (rows.length === 0) return;
    if (client) return client.insert(table, rows);
    await this.runInsert(this.pool, table, rows);
  }

  async update(
    table: string,
    values: Record<string, unknown>,
    where: Record<string, unknown>,
  ): Promise<number> {
    return this.runUpdate(this.pool, table, values, where);
  }

  async remove(table: string, where: Record<string, unknown>): Promise<number> {
    return this.runDelete(this.pool, table, where);
  }

  /**
   * Executa várias gravações como uma unidade. Substitui os antigos
   * "reescreve a tabela inteira" que existiam por falta de DML no sandbox.
   */
  async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(this.wrap(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw this.toHttpError(error);
    } finally {
      client.release();
    }
  }

  private wrap(client: PoolClient): Queryable {
    return {
      query: (sql, params) => this.runQuery(client, sql, params ?? {}),
      insert: (table, rows) => this.runInsert(client, table, rows),
      update: (table, values, where) =>
        this.runUpdate(client, table, values, where),
      remove: (table, where) => this.runDelete(client, table, where),
    };
  }

  private async runQuery<T extends Record<string, unknown>>(
    executor: Pool | PoolClient,
    sql: string,
    params: QueryParams,
  ): Promise<T[]> {
    const { text, values } = bindNamedParams(sql, params);
    try {
      const result = await executor.query(text, values);
      return result.rows as T[];
    } catch (error) {
      throw this.toHttpError(error, sql);
    }
  }

  private async runInsert(
    executor: Pool | PoolClient,
    table: string,
    rows: Record<string, unknown>[],
  ): Promise<void> {
    if (rows.length === 0) return;

    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const values: unknown[] = [];
    const tuples = rows.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column] ?? null);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const sql = `
      INSERT INTO ${table} (${columns.map(quoteIdent).join(', ')})
      VALUES ${tuples.join(', ')}
    `;

    try {
      await executor.query(sql, values);
    } catch (error) {
      throw this.toHttpError(error, `INSERT ${table}`);
    }
  }

  private async runUpdate(
    executor: Pool | PoolClient,
    table: string,
    values: Record<string, unknown>,
    where: Record<string, unknown>,
  ): Promise<number> {
    const params: unknown[] = [];
    const sets = Object.entries(values).map(([column, value]) => {
      params.push(value ?? null);
      return `${quoteIdent(column)} = $${params.length}`;
    });
    const filters = Object.entries(where).map(([column, value]) => {
      params.push(value);
      return `${quoteIdent(column)} = $${params.length}`;
    });

    if (!sets.length) return 0;
    if (!filters.length) {
      throw new Error(`UPDATE em ${table} sem filtro não é permitido`);
    }

    const sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE ${filters.join(' AND ')}`;

    try {
      const result = await executor.query(sql, params);
      return result.rowCount ?? 0;
    } catch (error) {
      throw this.toHttpError(error, `UPDATE ${table}`);
    }
  }

  private async runDelete(
    executor: Pool | PoolClient,
    table: string,
    where: Record<string, unknown>,
  ): Promise<number> {
    const params: unknown[] = [];
    const filters = Object.entries(where).map(([column, value]) => {
      params.push(value);
      return `${quoteIdent(column)} = $${params.length}`;
    });

    if (!filters.length) {
      throw new Error(`DELETE em ${table} sem filtro não é permitido`);
    }

    const sql = `DELETE FROM ${table} WHERE ${filters.join(' AND ')}`;

    try {
      const result = await executor.query(sql, params);
      return result.rowCount ?? 0;
    } catch (error) {
      throw this.toHttpError(error, `DELETE ${table}`);
    }
  }

  /**
   * Erros de domínio lançados dentro de uma transação (ex.: NotFoundException)
   * precisam chegar ao cliente com o próprio status; só falha de infraestrutura
   * vira 502.
   */
  private toHttpError(error: unknown, context?: string): Error {
    if (error instanceof HttpException) return error;
    const detail = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context ?? 'Postgres'}: ${detail}`);
    return new BadGatewayException(`Falha ao acessar o banco: ${detail}`);
  }
}

const IDENT_PATTERN = /^[a-z_][a-z0-9_]*$/;

function quoteIdent(name: string): string {
  return IDENT_PATTERN.test(name) ? name : `"${name.replace(/"/g, '""')}"`;
}

/**
 * Converte os parâmetros nomeados herdados do BigQuery (`@empresaId`) para os
 * posicionais do Postgres (`$1`), preservando a legibilidade das queries.
 * Literais e comentários são ignorados para não confundir e-mails com params.
 */
export function bindNamedParams(
  sql: string,
  params: QueryParams,
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const positions = new Map<string, number>();
  let text = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];

    if (char === "'" || char === '"') {
      const end = findClosing(sql, i, char);
      text += sql.slice(i, end);
      i = end;
      continue;
    }

    if (char === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      text += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (char === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i);
      const stop = end === -1 ? sql.length : end + 2;
      text += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (char === '@') {
      const match = /^@([a-zA-Z_][a-zA-Z0-9_]*)/.exec(sql.slice(i));
      if (match) {
        const name = match[1];
        if (!(name in params)) {
          throw new Error(`Parâmetro @${name} não informado`);
        }
        let position = positions.get(name);
        if (position === undefined) {
          values.push(params[name]);
          position = values.length;
          positions.set(name, position);
        }
        text += `$${position}`;
        i += match[0].length;
        continue;
      }
    }

    text += char;
    i += 1;
  }

  return { text, values };
}

function findClosing(sql: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }
  return sql.length;
}
