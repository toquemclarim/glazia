import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import { AllowInactive } from './allow-inactive.decorator';
import type { AuthContext } from './auth-context';
import { AuthService } from './auth.service';
import { CurrentAuth } from './current-auth.decorator';
import { AlterarEmailDto, AlterarSenhaDto } from './dto/conta.dto';

@Controller('conta')
export class ContaController {
  constructor(private readonly authService: AuthService) {}

  @AllowInactive()
  @Get('perfil')
  perfil(@CurrentAuth() auth: AuthContext) {
    return this.authService.me(auth);
  }

  @Patch('senha')
  alterarSenha(
    @CurrentAuth() auth: AuthContext,
    @Body() body: AlterarSenhaDto,
  ) {
    if (body.senhaNova !== body.confirmarSenha) {
      throw new BadRequestException('A confirmação da senha não confere');
    }
    if (body.senhaNova === body.senhaAtual) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual',
      );
    }
    return this.authService.changePassword(
      auth.userId,
      body.senhaAtual,
      body.senhaNova,
    );
  }

  @Patch('email')
  alterarEmail(
    @CurrentAuth() auth: AuthContext,
    @Body() body: AlterarEmailDto,
  ) {
    return this.authService.changeEmail(
      auth.userId,
      body.novoEmail,
      body.senhaAtual,
    );
  }
}
