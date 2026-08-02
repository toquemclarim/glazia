import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DespesasFixasModule } from '../despesas-fixas/despesas-fixas.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [AuthModule, DespesasFixasModule],
  controllers: [PlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
