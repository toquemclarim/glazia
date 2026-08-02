import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CriarUsuarioEquipeDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Informe o nome completo' })
  nomeCompleto!: string;

  @IsIn(['ADM', 'SOCIO', 'VENDAS'], {
    message: 'Cargo deve ser ADM, SOCIO ou VENDAS',
  })
  cargo!: 'ADM' | 'SOCIO' | 'VENDAS';

  /** Senha temporária definida pelo Diretor — compartilhada fora do sistema. */
  @IsString()
  @MinLength(6, { message: 'A senha temporária deve ter pelo menos 6 caracteres' })
  senhaTemporaria!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataNascimento deve estar no formato YYYY-MM-DD',
  })
  dataNascimento?: string;
}

export class AlterarAtivoUsuarioDto {
  @IsBoolean()
  ativo!: boolean;
}
