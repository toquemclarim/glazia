import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { assertAnalista, assertDiretoria } from '../auth/roles';
import { AnalyticsService } from './analytics.service';
import { MesQueryDto, ProdutoQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('resultado')
  resultado(@CurrentAuth() auth: AuthContext, @Query() query: MesQueryDto) {
    assertAnalista(auth);
    return this.analyticsService.resultadoMensal(auth.empresaId, query.mes);
  }

  @Get('rentabilidade')
  rentabilidade(@CurrentAuth() auth: AuthContext, @Query() query: MesQueryDto) {
    assertAnalista(auth);
    return this.analyticsService.rentabilidadeProdutos(
      auth.empresaId,
      query.mes,
    );
  }

  @Get('quantidade-produto')
  quantidadeProduto(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ProdutoQueryDto,
  ) {
    assertAnalista(auth);
    return this.analyticsService.quantidadeProduto(
      auth.empresaId,
      query.produto ?? 'Janela',
      query.mes,
    );
  }

  @Get('custos-fixos')
  custosFixos(@CurrentAuth() auth: AuthContext, @Query() query: MesQueryDto) {
    assertAnalista(auth);
    return this.analyticsService.custosFixos(auth.empresaId, query.mes);
  }

  @Get('contas-a-vencer')
  contasAVencer(@CurrentAuth() auth: AuthContext, @Query() query: MesQueryDto) {
    assertAnalista(auth);
    return this.analyticsService.contasAVencer(auth.empresaId, query.mes);
  }

  /** Dívidas a pagar: vencidas em aberto + próximas saídas (chat / painel). */
  @Get('contas-a-pagar')
  contasAPagar(
    @CurrentAuth() auth: AuthContext,
    @Query('dias') dias?: string,
  ) {
    assertAnalista(auth);
    const n = dias ? Number(dias) : 45;
    return this.analyticsService.contasAPagar(
      auth.empresaId,
      Number.isFinite(n) && n > 0 ? n : 45,
    );
  }

  @Get('contas-a-receber')
  contasAReceber(
    @CurrentAuth() auth: AuthContext,
    @Query() query: MesQueryDto,
  ) {
    assertAnalista(auth);
    return this.analyticsService.contasAReceber(auth.empresaId, query.mes);
  }

  @Get('fluxo-caixa')
  fluxoCaixa(@CurrentAuth() auth: AuthContext, @Query() query: MesQueryDto) {
    assertAnalista(auth);
    return this.analyticsService.fluxoCaixaMensal(auth.empresaId, query.mes);
  }

  @Post('contas-a-receber/:id/marcar-recebido')
  marcarRecebido(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
  ) {
    assertDiretoria(auth);
    return this.analyticsService.marcarRecebido(auth, id);
  }

  @Get('projecao-metas')
  projecaoMetas(@CurrentAuth() auth: AuthContext, @Query() query: MesQueryDto) {
    assertAnalista(auth);
    return this.analyticsService.projecaoEMetas(auth.empresaId, query.mes);
  }

  @Get('painel-socios')
  painelSocios(@CurrentAuth() auth: AuthContext, @Query() query: MesQueryDto) {
    assertAnalista(auth);
    return this.analyticsService.painelSocios(auth.empresaId, query.mes);
  }
}
