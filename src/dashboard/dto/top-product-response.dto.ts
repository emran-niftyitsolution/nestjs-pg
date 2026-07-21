// src/dashboard/dto/top-product-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const topProductResponseSchema = z.object({
  rank: z.number().describe('Rank by revenue, 1 = highest'),
  productId: z.uuid(),
  name: z.string(),
  slug: z.string(),
  unitsSold: z.number(),
  revenue: z.number(),
});

export class TopProductResponseDto extends createZodDto(
  topProductResponseSchema,
) {}
