// src/modules/inventory/dto/inventory-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const inventoryResponseSchema = z.object({
  productId: z.uuid(),
  stock: z.number().describe('products.stock — the on-hand total'),
  reservedStock: z.number(),
  soldStock: z.number(),
  availableStock: z.number().describe('stock - reservedStock'),
});

export class InventoryResponseDto extends createZodDto(
  inventoryResponseSchema,
) {}
