import { z } from 'zod';

const WEAK_JWT_SECRETS = new Set([
  'troque-por-um-segredo-longo',
  'changeme',
  'secret',
  'jwt-secret',
  'supersecret',
  'glazia-secret',
]);

const demoUserSchema = z.object({
  /** Chave primária do usuário (id_user). */
  idUser: z.string().min(1).optional(),
  email: z.email(),
  /** Somente no store de autenticação. Nunca vai no JWT. */
  password: z.string().min(4),
  empresaId: z.string().min(1),
  nome: z.string().min(1),
  cargo: z.enum(['ADM', 'DIRETOR', 'SOCIO', 'VENDAS']),
  dataNascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
    /** Conexão Postgres (Supabase). Nunca versionar o valor real. */
    DATABASE_URL: z.string().min(1),
    DB_SCHEMA: z.string().min(1).default('analytics'),
    /** Schema só de opções do CRUD (não grava fatos aqui). */
    DB_CATALOG_SCHEMA: z.string().min(1).default('dt_catalogo'),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    /**
     * Validação do certificado TLS do Postgres.
     * Supabase pooler costuma exigir false em dev; em produção prefira true
     * se a cadeia de certificados estiver correta no ambiente.
     */
    DATABASE_SSL_REJECT_UNAUTHORIZED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().min(1).default('8h'),
    /**
     * Seed local de usuários (somente development/test).
     * Em production deve ser `[]` — a API recusa subir se houver entradas.
     * JSON: [{ idUser?, email, password, empresaId, nome, cargo, dataNascimento? }]
     */
    AUTH_DEMO_USERS: z
      .string()
      .default('[]')
      .transform((value, ctx) => {
        try {
          const parsed: unknown = JSON.parse(value);
          const users = z.array(demoUserSchema).parse(parsed);
          return users;
        } catch {
          ctx.addIssue({
            code: 'custom',
            message:
              'AUTH_DEMO_USERS deve ser um JSON array válido de usuários',
          });
          return z.NEVER;
        }
      }),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.AUTH_DEMO_USERS.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['AUTH_DEMO_USERS'],
          message:
            'Em production AUTH_DEMO_USERS deve ser [] (seed demo proibido)',
        });
      }
      if (env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'Em production JWT_SECRET deve ter pelo menos 32 caracteres',
        });
      }
      if (WEAK_JWT_SECRETS.has(env.JWT_SECRET.toLowerCase())) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET é um valor de exemplo — troque antes de produção',
        });
      }
    }
  });

export type Environment = z.infer<typeof envSchema>;
export type DemoUser = z.infer<typeof demoUserSchema>;

/** Seed de usuários demo só em development/test. */
export function allowAuthDemoSeed(env: Pick<Environment, 'NODE_ENV'>): boolean {
  return env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuração de ambiente inválida: ${details}`);
  }

  return result.data;
}
