// src/dashboard/dto/top-product-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class TopProductResponseDto {
  @ApiProperty({ description: 'Rank by revenue, 1 = highest' })
  rank!: number;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  unitsSold!: number;

  @ApiProperty()
  revenue!: number;
}
