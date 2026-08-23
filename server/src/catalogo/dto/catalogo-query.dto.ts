import { IsIn, IsOptional, IsString } from 'class-validator';

export class CatalogoProdutosQueryDto {
  @IsOptional()
  @IsString()
  linha?: string;

  @IsOptional()
  @IsString()
  produto?: string;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CatalogoCustosQueryDto {
  @IsOptional()
  @IsString()
  tipoCusto?: string;

  @IsOptional()
  @IsString()
  linha?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  idProduto?: string;
}

export class CatalogoCoresQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['PERFIL', 'VIDRO', 'ACESSORIO', 'AMBOS'])
  aplicavelA?: string;
}
