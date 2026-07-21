// src/dashboard/dto/dashboard-summary-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryResponseDto {
  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  totalProducts!: number;

  @ApiProperty()
  totalCustomers!: number;
}
