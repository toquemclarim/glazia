import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PLANOS, STATUS_EMPRESA } from '../platform.constants';

export class CriarEmpresaPlatformDto {
  @IsString()
  @MinLength(2)
  nomeFantasia!: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsIn(PLANOS)
  plano!: (typeof PLANOS)[number];

  @IsIn(['ativa', 'trial'])
  status!: 'ativa' | 'trial';

  @IsOptional()
  @IsString()
  contatoNome?: string;

  @IsOptional()
  @IsEmail()
  contatoEmail?: string;

  @IsOptional()
  @IsString()
  contatoTelefone?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  /** Diretor inicial da empresa. */
  @IsString()
  @MinLength(2)
  diretorNome!: string;

  @IsEmail()
  diretorEmail!: string;

  @IsString()
  @MinLength(6)
  diretorSenhaTemporaria!: string;

  /** Se true (padrão), cria despesas fixas ilustrativas da vidraçaria. */
  @IsOptional()
  @IsBoolean()
  comCustosIniciais?: boolean;
}

export class AtualizarEmpresaPlatformDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsIn(PLANOS)
  plano?: (typeof PLANOS)[number];

  @IsOptional()
  @IsString()
  contatoNome?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  contatoEmail?: string | null;

  @IsOptional()
  @IsString()
  contatoTelefone?: string | null;

  @IsOptional()
  @IsString()
  observacao?: string | null;
}

export class AlterarStatusEmpresaDto {
  @IsIn(STATUS_EMPRESA)
  status!: (typeof STATUS_EMPRESA)[number];
}
