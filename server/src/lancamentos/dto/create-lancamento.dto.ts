import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export enum TipoLancamento {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
}

export enum StatusLancamento {
  PREVISTO = 'PREVISTO',
  REALIZADO = 'REALIZADO',
  CANCELADO = 'CANCELADO',
}

export class CreateLancamentoDto {
  @IsEnum(TipoLancamento)
  tipo!: TipoLancamento;

  @IsOptional()
  @IsUUID()
  idCliente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  clienteNome?: string;

  @IsOptional()
  @IsUUID()
  idFornecedor?: string;

  @IsOptional()
  @IsUUID()
  idProjeto?: string;

  @IsOptional()
  @IsUUID()
  idProduto?: string;

  @IsOptional()
  @IsUUID()
  idPlanoContas?: string;

  @IsString()
  @MaxLength(300)
  descricao!: string;

  @Matches(/^\d{1,12}(\.\d{1,2})?$/, {
    message: 'valor deve ser uma string decimal positiva com até 2 casas',
  })
  valor!: string;

  @IsDateString({ strict: true })
  dataLancamento!: string;

  @IsOptional()
  @IsEnum(StatusLancamento)
  status?: StatusLancamento;
}
