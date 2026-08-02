import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { Environment } from '../config/env';
import { DespesasFixasModule } from '../despesas-fixas/despesas-fixas.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ContaController } from './conta.controller';
import { EquipeController } from './equipe.controller';
import { EquipeService } from './equipe.service';
import { UsuariosStore } from './usuarios.store';

@Module({
  imports: [
    DespesasFixasModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController, ContaController, EquipeController],
  providers: [
    AuthService,
    EquipeService,
    UsuariosStore,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, JwtModule, UsuariosStore],
})
export class AuthModule {}
