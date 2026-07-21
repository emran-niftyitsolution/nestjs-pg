// src/cart/dto/cart-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const cartItemResponseSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  productSlug: z.string(),
  quantity: z.number(),
  priceSnapshot: z
    .number()
    .describe('Price when this line was last added to/updated'),
  currentPrice: z
    .number()
    .describe("The product's current price, for comparison"),
  lineTotal: z.number().describe('quantity * priceSnapshot'),
});

export class CartItemResponseDto extends createZodDto(cartItemResponseSchema) {}

export const cartResponseSchema = z.object({
  id: z.uuid(),
  items: z.array(cartItemResponseSchema),
  itemCount: z.number().describe('Sum of quantity across all lines'),
  subtotal: z.number().describe('Sum of lineTotal across all lines'),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CartResponseDto extends createZodDto(cartResponseSchema) {}
