// src/modules/cart/dto/add-cart-item.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1),
});

export class AddCartItemDto extends createZodDto(addCartItemSchema) {}
