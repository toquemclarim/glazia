import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CATEGORIA_IDS } from '../categorias';

export class CriarDespesaFixaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  descricao!: string;

  @IsIn([...CATEGORIA_IDS])
  categoriaId!: string;

  @IsNumber()
  @Min(0.01)
  valorMensal!: number;

  @IsInt()
  @Min(1)
  @Max(28)
  diaVencimento!: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataInicio!: string;

  /** true = custo sem data de término */
  @IsBoolean()
  semTermino!: boolean;

  @ValidateIf((o: CriarDespesaFixaDto) => !o.semTermino)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataFim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}

export class AtualizarDespesaFixaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  descricao?: string;

  @IsOptional()
  @IsIn([...CATEGORIA_IDS])
  categoriaId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valorMensal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  diaVencimento?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataInicio?: string;

  @IsOptional()
  @IsBoolean()
  semTermino?: boolean;

  @ValidateIf(
    (o: AtualizarDespesaFixaDto) =>
      o.semTermino === false ||
      (o.semTermino === undefined && o.dataFim != null),
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataFim?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string | null;
}
