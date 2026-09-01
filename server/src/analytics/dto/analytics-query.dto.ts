import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class MesQueryDto {
  /** Formato YYYY-MM. Se omitido, usa o mês atual (UTC). */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  mes?: string;
}

export class ProdutoQueryDto extends MesQueryDto {
  @IsOptional()
  @IsString()
  produto?: string;
}

export class MarcarRecebidoDto {
  /** Se omitido, quita o valor total da parcela. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  valorRecebido?: number;
}
