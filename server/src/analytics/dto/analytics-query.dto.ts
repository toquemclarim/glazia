import { IsOptional, IsString, Matches } from 'class-validator';

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
