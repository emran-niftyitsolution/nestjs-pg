// src/cart/dto/cart-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSlug!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({
    description: 'Price when this line was last added to/updated',
  })
  priceSnapshot!: number;

  @ApiProperty({ description: "The product's current price, for comparison" })
  currentPrice!: number;

  @ApiProperty({ description: 'quantity * priceSnapshot' })
  lineTotal!: number;
}

export class CartResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty({ description: 'Sum of quantity across all lines' })
  itemCount!: number;

  @ApiProperty({ description: 'Sum of lineTotal across all lines' })
  subtotal!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
