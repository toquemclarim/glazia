import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthContext } from './auth-context';
import { CurrentAuth } from './current-auth.decorator';
import { AlterarAtivoUsuarioDto, CriarUsuarioEquipeDto } from './dto/equipe.dto';
import { EquipeService } from './equipe.service';
import { assertGestaoEquipe } from './roles';

@Controller('equipe')
export class EquipeController {
  constructor(private readonly equipeService: EquipeService) {}

  @Get('usuarios')
  listar(@CurrentAuth() auth: AuthContext) {
    assertGestaoEquipe(auth);
    return this.equipeService.listar(auth);
  }

  @Post('usuarios')
  criar(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CriarUsuarioEquipeDto,
  ) {
    assertGestaoEquipe(auth);
    return this.equipeService.criar(auth, body);
  }

  @Patch('usuarios/:idUser/ativo')
  alterarAtivo(
    @CurrentAuth() auth: AuthContext,
    @Param('idUser') idUser: string,
    @Body() body: AlterarAtivoUsuarioDto,
  ) {
    assertGestaoEquipe(auth);
    return this.equipeService.alterarAtivo(auth, idUser, body.ativo);
  }
}
