import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import {
  AtualizarCustoEstoqueDto,
  AtualizarVendaDto,
  CalendarioVendasQueryDto,
  CriarCustoDto,
  CriarVendaDto,
  ListarCustosEstoqueQueryDto,
  ListarVendasQueryDto,
} from './dto/lancamentos.dto';
import { LancamentosService } from './lancamentos.service';

@Controller('lancamentos')
export class LancamentosController {
  constructor(private readonly lancamentosService: LancamentosService) {}

  /** Lista vendas recentes para associar custos (com busca e data). */
  @Get('vendas')
  listarVendas(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListarVendasQueryDto,
  ) {
    return this.lancamentosService.listarVendas(auth, query);
  }

  @Get('vendas/calendario')
  calendarioVendas(
    @CurrentAuth() auth: AuthContext,
    @Query() query: CalendarioVendasQueryDto,
  ) {
    return this.lancamentosService.calendarioVendas(auth, query);
  }

  @Get('vendas/:id')
  obterVenda(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.lancamentosService.obterVenda(auth, id);
  }

  /** Grava fato_venda + itens + custos opcionais + previsão de caixa. */
  @Post('vendas')
  criarVenda(@CurrentAuth() auth: AuthContext, @Body() body: CriarVendaDto) {
    return this.lancamentosService.criarVenda(auth, body);
  }

  @Patch('vendas/:id')
  atualizarVenda(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() body: AtualizarVendaDto,
  ) {
    return this.lancamentosService.atualizarVenda(auth, id, body);
  }

  @Delete('vendas/:id')
  excluirVenda(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.lancamentosService.excluirVenda(auth, id);
  }

  /** Custos de estoque (sem venda). Listar antes de :id. */
  @Get('custos')
  listarCustosEstoque(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListarCustosEstoqueQueryDto,
  ) {
    return this.lancamentosService.listarCustosEstoque(auth, query);
  }

  @Get('custos/:id')
  obterCustoEstoque(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.lancamentosService.obterCustoEstoque(auth, id);
  }

  /** Grava fato_custos_operacionais (estoque ou associado a venda). */
  @Post('custos')
  criarCusto(@CurrentAuth() auth: AuthContext, @Body() body: CriarCustoDto) {
    return this.lancamentosService.criarCusto(auth, body);
  }

  @Patch('custos/:id')
  atualizarCustoEstoque(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() body: AtualizarCustoEstoqueDto,
  ) {
    return this.lancamentosService.atualizarCustoEstoque(auth, id, body);
  }

  @Delete('custos/:id')
  excluirCustoEstoque(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
  ) {
    return this.lancamentosService.excluirCustoEstoque(auth, id);
  }
}
