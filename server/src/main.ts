import helmet from '@fastify/helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import type { Environment } from './config/env';

/**
 * CORS para Vercel (prod + previews) e lista explícita em CORS_ORIGIN.
 * Com credentials:true não dá para usar origin:'*'.
 */
function buildCorsOriginDelegate(corsOrigin: string) {
  const allowed = new Set(
    corsOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );
  const allowVercelPreviews =
    process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true';

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowed.has(origin)) {
      callback(null, true);
      return;
    }
    if (
      allowVercelPreviews &&
      /^https:\/\/[\w-]+(?:-[\w]+)*\.vercel\.app$/i.test(origin)
    ) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS bloqueado para origem: ${origin}`), false);
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  );
  const config = app.get(ConfigService<Environment, true>);
  const logger = new Logger('Bootstrap');

  await app.register(helmet);

  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  app.enableCors({
    origin: buildCorsOriginDelegate(corsOrigin),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();

  // Render / containers: PORT vem do ambiente; host deve ser 0.0.0.0
  const port = Number(process.env.PORT) || config.get('PORT', { infer: true });
  await app.listen({ port, host: '0.0.0.0' });
  logger.log(`API ouvindo em 0.0.0.0:${port}`);
}

void bootstrap();
