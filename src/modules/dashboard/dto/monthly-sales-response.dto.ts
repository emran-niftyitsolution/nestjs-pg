// src/modules/dashboard/dto/monthly-sales-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const monthlySalesResponseSchema = z.object({
  month: z.iso.datetime(),
  orderCount: z.number(),
  revenue: z.number(),
});

export class MonthlySalesResponseDto extends createZodDto(
  monthlySalesResponseSchema,
) {}
