import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  nomeFantasia!: string;

  @IsOptional()
  @IsString()
  razaoSocial?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsString()
  @MinLength(2)
  nomeDiretor!: string;

  @IsString()
  @MinLength(10)
  telefone!: string;

  @IsEmail()
  emailContato!: string;

  @IsEmail()
  emailLogin!: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  senha!: string;

  @IsString()
  @MinLength(8)
  confirmarSenha!: string;

  @IsBoolean()
  @Equals(true, { message: 'É necessário aceitar os Termos de Uso' })
  aceitouTermos!: boolean;

  /** Dia em que o mês da análise começa (1 = calendário). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  diaInicioPeriodo!: number;
}
