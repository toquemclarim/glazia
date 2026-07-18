import type { FastifyRequest } from 'fastify';
import type { GlaziaSupabaseClient } from '../supabase/supabase.service';

export interface AuthContext {
  userId: string;
  email: string | null;
  empresaId: string;
  nomeCompleto: string | null;
  cargo: string | null;
  accessToken: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  auth: AuthContext;
  supabase: GlaziaSupabaseClient;
}
