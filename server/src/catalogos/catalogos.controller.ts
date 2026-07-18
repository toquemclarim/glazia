import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-context';
import { CatalogosService } from './catalogos.service';

@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  listar(@Req() request: AuthenticatedRequest) {
    return this.catalogosService.listar(
      request.supabase,
      request.auth.empresaId,
    );
  }
}
