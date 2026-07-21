// src/dashboard/dto/monthly-sales-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class MonthlySalesResponseDto {
  @ApiProperty()
  month!: Date;

  @ApiProperty()
  orderCount!: number;

  @ApiProperty()
  revenue!: number;
}
