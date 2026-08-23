import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class GastoItemDto {
  @IsNumber()
  idCustoCatalogo!: number;

  @IsString()
  descricao!: string;

  @IsOptional()
  @IsString()
  tipoCusto?: string;

  @IsOptional()
  @IsString()
  espessura?: string | null;

  @IsOptional()
  @IsString()
  linha?: string | null;

  @IsNumber()
  @Min(0.01)
  valor!: number;

  @IsNumber()
  @Min(0.0001)
  quantidade!: number;

  @IsNumber()
  @Min(0)
  valorUnitario!: number;
}

export class ItemVendaDto {
  @IsNumber()
  idProdutoCatalogo!: number;

  @IsString()
  linha!: string;

  @IsString()
  produto!: string;

  @IsString()
  cor!: string;

  @IsOptional()
  @IsString()
  @IsIn(['PERFIL', 'VIDRO', 'ACESSORIO'])
  tipoCorPrincipal?: string;

  @IsOptional()
  @IsString()
  corPerfil?: string | null;

  @IsOptional()
  @IsString()
  corVidro?: string | null;

  @IsOptional()
  @IsString()
  corAcessorio?: string | null;

  @IsOptional()
  @IsString()
  unidadeVenda?: string;

  @IsNumber()
  @Min(0.0001)
  quantidade!: number;

  @IsNumber()
  @Min(0)
  valorUnitario!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GastoItemDto)
  gastos?: GastoItemDto[];
}

export class CriarVendaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  itens!: ItemVendaDto[];

  /** Previsão de recebimento (YYYY-MM-DD). */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataPrevisaoRecebimento!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataVenda?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  /** Matrícula (PK) do cliente em dim_cliente — obrigatória. */
  @IsString()
  @Matches(/^\d{8}$/, { message: 'idCliente deve ser a matrícula de 8 dígitos' })
  idCliente!: string;
}

export class CriarCustoDto {
  @IsNumber()
  idCustoCatalogo!: number;

  @IsString()
  descricao!: string;

  @IsOptional()
  @IsString()
  tipoCusto?: string;

  @IsOptional()
  @IsString()
  espessura?: string | null;

  @IsOptional()
  @IsString()
  linha?: string | null;

  @IsNumber()
  @Min(0.01)
  valor!: number;

  @IsNumber()
  @Min(0.0001)
  quantidade!: number;

  @IsNumber()
  @Min(0)
  valorUnitario!: number;

  @IsBoolean()
  associadoAVenda!: boolean;

  @ValidateIf((o: CriarCustoDto) => o.associadoAVenda === true)
  @IsString()
  idVenda?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataCusto?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class ListarVendasQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** Data de registro da venda (YYYY-MM-DD). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data?: string;
}

export class CalendarioVendasQueryDto {
  /** Mês do calendário (YYYY-MM). Sem valor, usa o mês vigente. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  mes?: string;
}

/** Custos de estoque (id_venda IS NULL). */
export class ListarCustosEstoqueQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** Competência YYYY-MM (data_emissao_nf). Sem valor, mês vigente. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  mes?: string;
}

export class AtualizarCustoEstoqueDto {
  @IsNumber()
  @Min(0.0001)
  quantidade!: number;

  @IsNumber()
  @Min(0)
  valorUnitario!: number;

  /** Total = quantidade × valorUnitario (servidor recalcula). */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsString()
  descricao?: string;
}

/** Mesmo payload da criação — substitui itens/custos da venda. */
export class AtualizarVendaDto extends CriarVendaDto {}
