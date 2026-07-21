// src/products/dto/admin-product-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { ProductQueryDto } from './product-query.dto';

export class AdminProductQueryDto extends ProductQueryDto {
  @ApiPropertyOptional({
    enum: ProductStatus,
    description: 'Omit to see products in every status',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
