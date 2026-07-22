// src/wishlist/dto/wishlist-item-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const wishlistItemResponseSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  productSlug: z.string(),
  price: z.number(),
  stock: z.number(),
  createdAt: z.iso.datetime(),
});

export class WishlistItemResponseDto extends createZodDto(
  wishlistItemResponseSchema,
) {}
