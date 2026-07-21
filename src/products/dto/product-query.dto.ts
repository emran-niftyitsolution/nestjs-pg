// src/products/dto/product-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';
import { ProductSort } from '@/common/enums/product-sort.enum';

export class ProductQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by brand slug' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description:
      'Full-text search over name + description. When set, results are ranked by relevance and returned as a single bounded page (no cursor) — see the endpoint description for why.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProductSort, default: ProductSort.Newest })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;
}
