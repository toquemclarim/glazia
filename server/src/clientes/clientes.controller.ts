import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { ClientesService } from './clientes.service';
import {
  AtualizarClienteDto,
  CriarClienteDto,
  ListarClientesQueryDto,
} from './dto/clientes.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  listar(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListarClientesQueryDto,
  ) {
    const status =
      query.status ??
      (query.incluirInativos === 'true' || query.incluirInativos === '1'
        ? 'todos'
        : 'ativos');
    return this.service.listar(auth, query.q, status);
  }

  @Get(':id')
  obter(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.obter(auth, id);
  }

  @Post()
  criar(@CurrentAuth() auth: AuthContext, @Body() dto: CriarClienteDto) {
    return this.service.criar(auth, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: AtualizarClienteDto,
  ) {
    return this.service.atualizar(auth, id, dto);
  }

  /** Soft-delete — POST evita problemas do Fastify com DELETE + JSON vazio. */
  @Post(':id/desativar')
  desativar(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.desativar(auth, id);
  }

  @Post(':id/reativar')
  reativar(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.reativar(auth, id);
  }
}
