import { Controller, Get } from '@nestjs/common';
import { CurrentAuth } from './auth/current-auth.decorator';
import type { AuthContext } from './auth/auth-context';
import { Public } from './auth/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('me')
  getMe(@CurrentAuth() auth: AuthContext) {
    return {
      id: auth.userId,
      email: auth.email,
      nomeCompleto: auth.nomeCompleto,
      cargo: auth.cargo,
      empresaId: auth.empresaId,
    };
  }
}
