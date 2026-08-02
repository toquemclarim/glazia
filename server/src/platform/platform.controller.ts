import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { assertPlatform } from '../auth/roles';
import {
  AlterarStatusEmpresaDto,
  AtualizarEmpresaPlatformDto,
  CriarEmpresaPlatformDto,
} from './dto/platform.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('resumo')
  resumo(@CurrentAuth() auth: AuthContext) {
    assertPlatform(auth);
    return this.platformService.resumo();
  }

  @Get('empresas')
  listar(@CurrentAuth() auth: AuthContext) {
    assertPlatform(auth);
    return this.platformService.listarEmpresas();
  }

  @Get('empresas/:id')
  obter(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    assertPlatform(auth);
    return this.platformService.obterEmpresa(id);
  }

  @Post('empresas')
  criar(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CriarEmpresaPlatformDto,
  ) {
    assertPlatform(auth);
    return this.platformService.criarEmpresa(body);
  }

  @Patch('empresas/:id')
  atualizar(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() body: AtualizarEmpresaPlatformDto,
  ) {
    assertPlatform(auth);
    return this.platformService.atualizarEmpresa(id, body);
  }

  @Patch('empresas/:id/status')
  status(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() body: AlterarStatusEmpresaDto,
  ) {
    assertPlatform(auth);
    return this.platformService.alterarStatus(id, body);
  }
}
