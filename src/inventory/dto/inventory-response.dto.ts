// src/inventory/dto/inventory-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ description: 'products.stock — the on-hand total' })
  stock!: number;

  @ApiProperty()
  reservedStock!: number;

  @ApiProperty()
  soldStock!: number;

  @ApiProperty({ description: 'stock - reservedStock' })
  availableStock!: number;
}
