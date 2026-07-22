// src/product-images/dto/update-product-image.dto.ts

import { createZodDto } from 'nestjs-zod';
import { createProductImageSchema } from './create-product-image.dto';

export const updateProductImageSchema = createProductImageSchema.partial();

export class UpdateProductImageDto extends createZodDto(
  updateProductImageSchema,
) {}
