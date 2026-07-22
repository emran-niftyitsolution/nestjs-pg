// src/products/dto/product-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { productDimensionsSchema } from './product-dimensions.dto';

export const productResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  sku: z.string(),
  price: z.number(),
  discountPercentage: z.number().nullable(),
  finalPrice: z
    .number()
    .describe('price with discountPercentage applied, rounded to 2dp'),
  stock: z.number(),
  weightKg: z.number().nullable(),
  dimensionsCm: productDimensionsSchema.nullable(),
  specifications: z.record(z.string(), z.unknown()),
  categoryId: z.uuid(),
  brandId: z.uuid().nullable(),
  status: z.enum(ProductStatus),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class ProductResponseDto extends createZodDto(productResponseSchema) {}
