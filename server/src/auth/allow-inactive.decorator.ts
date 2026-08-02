import { SetMetadata } from '@nestjs/common';

export const ALLOW_INACTIVE_KEY = 'allowInactive';

/** Permite usuário de empresa inativa/suspensa acessar a rota (ex.: /auth/me). */
export const AllowInactive = () => SetMetadata(ALLOW_INACTIVE_KEY, true);
