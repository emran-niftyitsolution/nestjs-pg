// src/modules/product-images/dto/create-product-image.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createProductImageSchema = z.object({
  url: z.url(),
  altText: z.string().max(255).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export class CreateProductImageDto extends createZodDto(
  createProductImageSchema,
) {}
