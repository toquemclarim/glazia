import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { CurrentAuth } from './auth/current-auth.decorator';
import type { AuthContext } from './auth/auth-context';
import { Public } from './auth/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health/db')
  getDbHealth() {
    return this.appService.getDbHealth();
  }

  /** Compat: mesmo payload de /auth/me (inclui plano da empresa). */
  @Get('me')
  getMe(@CurrentAuth() auth: AuthContext) {
    return this.authService.me(auth);
  }
}
