import { Controller, Get, Query } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { assertOperador } from '../auth/roles';
import { CatalogoService } from './catalogo.service';
import {
  CatalogoCoresQueryDto,
  CatalogoCustosQueryDto,
  CatalogoProdutosQueryDto,
} from './dto/catalogo-query.dto';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  /** Linhas comerciais ativas (ex.: GOLD, SUPREMA, TEMPERADO). */
  @Get('linhas')
  linhas(@CurrentAuth() auth: AuthContext) {
    assertOperador(auth);
    return this.catalogoService.listarLinhas();
  }

  /**
   * Cascata do dropdown de venda.
   * Query: linha?, produto?, q?
   */
  @Get('produtos')
  produtos(
    @CurrentAuth() auth: AuthContext,
    @Query() query: CatalogoProdutosQueryDto,
  ) {
    assertOperador(auth);
    return this.catalogoService.listarProdutos(query);
  }

  /**
   * Cores de referência (dim_cor) por aplicação: PERFIL, VIDRO ou ACESSORIO.
   */
  @Get('cores')
  cores(
    @CurrentAuth() auth: AuthContext,
    @Query() query: CatalogoCoresQueryDto,
  ) {
    assertOperador(auth);
    return this.catalogoService.listarCores(query);
  }

  /** Tipos de custo (VIDRO, PERFIL, FERRAGEM...). */
  @Get('tipos-custo')
  tiposCusto(@CurrentAuth() auth: AuthContext) {
    assertOperador(auth);
    return this.catalogoService.listarTiposCusto();
  }

  /**
   * Linhas de custo para cascata Tipo → Linha → Item.
   * Query: tipoCusto?
   */
  @Get('custos/linhas')
  linhasCusto(
    @CurrentAuth() auth: AuthContext,
    @Query('tipoCusto') tipoCusto?: string,
  ) {
    assertOperador(auth);
    return this.catalogoService.listarLinhasCusto(tipoCusto);
  }

  /**
   * Itens de custo/insumo para o CRUD.
   * Query: tipoCusto?, linha?, q?, idProduto?
   */
  @Get('custos')
  custos(
    @CurrentAuth() auth: AuthContext,
    @Query() query: CatalogoCustosQueryDto,
  ) {
    assertOperador(auth);
    return this.catalogoService.listarCustos(query);
  }
}
