// src/dashboard/dto/top-category-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class TopCategoryResponseDto {
  @ApiProperty({ description: 'Rank by revenue, 1 = highest' })
  rank!: number;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  unitsSold!: number;

  @ApiProperty()
  revenue!: number;
}
