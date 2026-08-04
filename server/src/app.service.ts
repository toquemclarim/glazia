import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly db: DatabaseService) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'glazia-api',
      timestamp: new Date().toISOString(),
    };
  }

  /** Diagnóstico de conexão com o Supabase (não expõe a URL). */
  async getDbHealth() {
    try {
      await this.db.query<{ ok: number }>('SELECT 1 AS ok');
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        database: 'disconnected',
        detail,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
