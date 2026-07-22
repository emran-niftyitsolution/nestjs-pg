// src/modules/product-images/dto/product-image-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const productImageResponseSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  url: z.string(),
  altText: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.iso.datetime(),
});

export class ProductImageResponseDto extends createZodDto(
  productImageResponseSchema,
) {}
