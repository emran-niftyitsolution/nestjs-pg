// src/cart/dto/update-cart-item.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    minimum: 1,
    description: 'Sets the exact quantity (not a delta)',
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
