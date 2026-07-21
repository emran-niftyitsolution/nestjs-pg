// src/dashboard/dto/top-category-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const topCategoryResponseSchema = z.object({
  rank: z.number().describe('Rank by revenue, 1 = highest'),
  categoryId: z.uuid(),
  name: z.string(),
  unitsSold: z.number(),
  revenue: z.number(),
});

export class TopCategoryResponseDto extends createZodDto(
  topCategoryResponseSchema,
) {}
