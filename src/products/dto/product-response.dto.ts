// src/products/dto/product-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { ProductDimensionsDto } from './product-dimensions.dto';

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  price!: number;

  @ApiPropertyOptional({ nullable: true })
  discountPercentage!: number | null;

  @ApiProperty({
    description: 'price with discountPercentage applied, rounded to 2dp',
  })
  finalPrice!: number;

  @ApiProperty()
  stock!: number;

  @ApiPropertyOptional({ nullable: true })
  weightKg!: number | null;

  @ApiPropertyOptional({ type: ProductDimensionsDto, nullable: true })
  dimensionsCm!: ProductDimensionsDto | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  specifications!: Record<string, unknown>;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  brandId!: string | null;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
