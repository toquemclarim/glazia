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

/** Origens explícitas + opcionalmente previews da Vercel. */
function resolveCorsOrigins(corsOrigin: string): (string | RegExp)[] {
  const allowed = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true') {
    return [
      ...allowed,
      /^https:\/\/[\w-]+(?:-[\w]+)*\.vercel\.app$/i,
    ];
  }

  return allowed;
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, ignoreTrailingSlash: true }),
  );
  const config = app.get(ConfigService<Environment, true>);
  const logger = new Logger('Bootstrap');

  // CORP same-origin (default do helmet) quebra fetch cross-origin do front em :5173.
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  app.enableCors({
    origin: resolveCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
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

  // Render / containers: PORT do ambiente; host 0.0.0.0
  const port = Number(process.env.PORT) || config.get('PORT', { infer: true });
  await app.listen({ port, host: '0.0.0.0' });
  logger.log(`API ouvindo em 0.0.0.0:${port}`);
}

void bootstrap();
