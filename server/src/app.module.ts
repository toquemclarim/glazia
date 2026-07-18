import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { validateEnvironment } from './config/env';
import { LancamentosModule } from './lancamentos/lancamentos.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    SupabaseModule,
    AuthModule,
    CatalogosModule,
    LancamentosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
