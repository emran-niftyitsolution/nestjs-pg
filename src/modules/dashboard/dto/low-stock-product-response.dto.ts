// src/dashboard/dto/low-stock-product-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const lowStockProductResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  sku: z.string(),
  stock: z.number(),
  categoryId: z.uuid().nullable(),
});

export class LowStockProductResponseDto extends createZodDto(
  lowStockProductResponseSchema,
) {}
