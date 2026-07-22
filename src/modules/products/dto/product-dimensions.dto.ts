// src/modules/products/dto/product-dimensions.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const productDimensionsSchema = z.object({
  length: z.number().min(0).describe('Length in centimeters'),
  width: z.number().min(0).describe('Width in centimeters'),
  height: z.number().min(0).describe('Height in centimeters'),
});

export class ProductDimensionsDto extends createZodDto(
  productDimensionsSchema,
) {}
