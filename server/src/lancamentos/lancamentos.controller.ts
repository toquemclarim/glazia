import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-context';
import { CreateLancamentoDto } from './dto/create-lancamento.dto';
import { ListLancamentosDto } from './dto/list-lancamentos.dto';
import { LancamentosService } from './lancamentos.service';

@Controller('lancamentos')
export class LancamentosController {
  constructor(private readonly lancamentosService: LancamentosService) {}

  @Get()
  listar(
    @Req() request: AuthenticatedRequest,
    @Query() filtros: ListLancamentosDto,
  ) {
    return this.lancamentosService.listar(
      request.supabase,
      request.auth.empresaId,
      filtros,
    );
  }

  @Post()
  criar(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateLancamentoDto,
  ) {
    return this.lancamentosService.criar(
      request.supabase,
      request.auth.empresaId,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.lancamentosService.remover(
      request.supabase,
      request.auth.empresaId,
      id,
    );
  }
}
