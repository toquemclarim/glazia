import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, Max, Min, MinLength } from 'class-validator';

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

export class AlterarPeriodoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  diaInicioPeriodo!: number;
}

export class AlterarEmailDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  novoEmail!: string;

  @IsString()
  @MinLength(4)
  senhaAtual!: string;
}
