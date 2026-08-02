import { Body, Controller, Get, Post } from '@nestjs/common';
import type { AuthContext } from './auth-context';
import { AllowInactive } from './allow-inactive.decorator';
import { AuthService } from './auth.service';
import { CurrentAuth } from './current-auth.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @AllowInactive()
  @Get('me')
  me(@CurrentAuth() auth: AuthContext) {
    return this.authService.me(auth);
  }
}
