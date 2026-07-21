// src/dashboard/dto/low-stock-product-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LowStockProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  stock!: number;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  categoryId!: string | null;
}
