// src/cart/dto/update-cart-item.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(1)
    .describe('Sets the exact quantity (not a delta)'),
});

export class UpdateCartItemDto extends createZodDto(updateCartItemSchema) {}
