import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
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
}
