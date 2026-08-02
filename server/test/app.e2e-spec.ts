import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
    process.env.DB_SCHEMA = 'analytics';
    process.env.DB_CATALOG_SCHEMA = 'dt_catalogo';
    process.env.JWT_SECRET = 'test-secret-at-least-16';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.AUTH_DEMO_USERS = '[]';
    process.env.CORS_ORIGIN = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            status: 'ok',
            service: 'glazia-api',
          }),
        );
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
