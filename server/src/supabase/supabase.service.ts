import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import type { Environment } from '../config/env';

export type GlaziaSupabaseClient = SupabaseClient;

@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly publishableKey: string;
  private readonly publicClient: GlaziaSupabaseClient;

  constructor(config: ConfigService<Environment, true>) {
    this.url = config.get('SUPABASE_URL', { infer: true });
    this.publishableKey = config.get('SUPABASE_PUBLISHABLE_KEY', {
      infer: true,
    });
    // O schema tipado será regenerado quando o modelo transacional estabilizar.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.publicClient = createClient(this.url, this.publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  async getUser(accessToken: string): Promise<User | null> {
    const { data, error } = await this.publicClient.auth.getUser(accessToken);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  forAccessToken(accessToken: string): GlaziaSupabaseClient {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return createClient(this.url, this.publishableKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
}
