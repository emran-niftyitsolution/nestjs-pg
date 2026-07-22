// src/modules/products/dto/create-product.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { productDimensionsSchema } from './product-dimensions.dto';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .max(220)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message: 'slug must be lowercase alphanumeric, hyphen-separated',
    })
    .optional()
    .describe('URL-friendly identifier; derived from the name if omitted'),
  description: z.string().optional(),
  sku: z.string().min(1).max(64).describe('Stock keeping unit'),
  price: z.number().min(0),
  discountPercentage: z.number().int().min(1).max(100).optional(),
  stock: z.number().int().min(0).optional(),
  weightKg: z.number().min(0).optional().describe('Weight in kilograms'),
  dimensionsCm: productDimensionsSchema.optional(),
  specifications: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Arbitrary product attributes, e.g. { "ram": "16GB", "color": "black" }',
    ),
  categoryId: z.uuid(),
  brandId: z.uuid().optional(),
  status: z.enum(ProductStatus).optional(),
});

export class CreateProductDto extends createZodDto(createProductSchema) {}
