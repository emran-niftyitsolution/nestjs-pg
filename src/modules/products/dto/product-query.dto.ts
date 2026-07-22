// src/products/dto/product-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';
import { ProductSort } from '@/common/enums/product-sort.enum';

export const productQuerySchema = cursorPaginationQuerySchema.extend({
  category: z.string().optional().describe('Filter by category slug'),
  brand: z.string().optional().describe('Filter by brand slug'),
  search: z
    .string()
    .optional()
    .describe(
      'Full-text search over name + description. When set, results are ranked by relevance and returned as a single bounded page (no cursor) — see the endpoint description for why.',
    ),
  sort: z.enum(ProductSort).optional(),
});

export class ProductQueryDto extends createZodDto(productQuerySchema) {}
