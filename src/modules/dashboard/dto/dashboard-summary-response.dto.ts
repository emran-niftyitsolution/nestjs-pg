// src/dashboard/dto/dashboard-summary-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const dashboardSummaryResponseSchema = z.object({
  totalRevenue: z.number(),
  totalOrders: z.number(),
  totalProducts: z.number(),
  totalCustomers: z.number(),
});

export class DashboardSummaryResponseDto extends createZodDto(
  dashboardSummaryResponseSchema,
) {}
