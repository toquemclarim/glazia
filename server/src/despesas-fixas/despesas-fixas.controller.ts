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
import { assertDiretoria } from '../auth/roles';
import { DespesasFixasService } from './despesas-fixas.service';
import {
  AtualizarDespesaFixaDto,
  CriarDespesaFixaDto,
} from './dto/despesas-fixas.dto';

@Controller('despesas-fixas')
export class DespesasFixasController {
  constructor(private readonly service: DespesasFixasService) {}

  @Get('categorias')
  categorias(@CurrentAuth() auth: AuthContext) {
    assertDiretoria(auth);
    return this.service.listarCategorias();
  }

  /** Próximos vencimentos (padrão: 5 dias) — tela inicial do diretor. */
  @Get('proximos-vencimentos')
  proximos(
    @CurrentAuth() auth: AuthContext,
    @Query('dias') dias?: string,
  ) {
    const n = dias ? Number(dias) : 5;
    return this.service.proximosVencimentos(
      auth,
      Number.isFinite(n) && n > 0 ? Math.min(n, 30) : 5,
    );
  }

  @Get()
  listar(@CurrentAuth() auth: AuthContext) {
    return this.service.listar(auth);
  }

  @Get(':id/historico-pagamentos')
  historico(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.historicoPagamentos(auth, id);
  }

  @Post()
  criar(@CurrentAuth() auth: AuthContext, @Body() body: CriarDespesaFixaDto) {
    return this.service.criar(auth, body);
  }

  @Post(':id/marcar-pago')
  marcarPago(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() body?: { idTransacao?: string },
  ) {
    return this.service.marcarPago(auth, id, body?.idTransacao);
  }

  @Patch(':id')
  atualizar(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() body: AtualizarDespesaFixaDto,
  ) {
    return this.service.atualizar(auth, id, body);
  }

  @Delete(':id')
  remover(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.remover(auth, id);
  }
}
