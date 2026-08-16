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
  AtualizarVendaDto,
  CalendarioVendasQueryDto,
  CriarCustoDto,
  CriarVendaDto,
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

  /** Grava fato_custos_operacionais (estoque ou associado a venda). */
  @Post('custos')
  criarCusto(@CurrentAuth() auth: AuthContext, @Body() body: CriarCustoDto) {
    return this.lancamentosService.criarCusto(auth, body);
  }
}
