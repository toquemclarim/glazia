import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const DOC = /^[\d./-]*$/;

export class ClienteCamposDto {
  @IsIn(['PF', 'PJ'])
  tipoPessoa!: 'PF' | 'PJ';

  /** Único campo obrigatório. */
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomeCompleto?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  razaoSocial?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomeFantasia?: string | null;

  @ValidateIf((o: ClienteCamposDto) => o.tipoPessoa === 'PF')
  @IsOptional()
  @IsString()
  @MaxLength(18)
  @Matches(DOC, { message: 'CPF inválido' })
  cpf?: string | null;

  @ValidateIf((o: ClienteCamposDto) => o.tipoPessoa === 'PJ')
  @IsOptional()
  @IsString()
  @MaxLength(22)
  @Matches(DOC, { message: 'CNPJ inválido' })
  cnpj?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  rg?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  inscricaoEstadual?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  inscricaoMunicipal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  celular?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  cep?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  logradouro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  complemento?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bairro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cidade?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  @Matches(/^[A-Za-z]{2}$/, { message: 'UF deve ter 2 letras' })
  uf?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contatoNome?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string | null;
}

export class CriarClienteDto extends ClienteCamposDto {}

export class AtualizarClienteDto extends ClienteCamposDto {}

export class ListarClientesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  /** ativos | inativos | todos. Default: ativos. */
  @IsOptional()
  @IsIn(['ativos', 'inativos', 'todos'])
  status?: 'ativos' | 'inativos' | 'todos';

  /** Legado: se true, equivale a status=todos. */
  @IsOptional()
  @IsIn(['true', 'false', '1', '0'])
  incluirInativos?: string;
}
