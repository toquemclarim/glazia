import { IsEmail, IsString, MinLength } from 'class-validator';

export class AlterarSenhaDto {
  @IsString()
  @MinLength(4)
  senhaAtual!: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  senhaNova!: string;

  @IsString()
  @MinLength(6)
  confirmarSenha!: string;
}

export class AlterarEmailDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  novoEmail!: string;

  @IsString()
  @MinLength(4)
  senhaAtual!: string;
}
