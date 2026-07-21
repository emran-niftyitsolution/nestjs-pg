// src/products/dto/admin-product-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { productQuerySchema } from './product-query.dto';

export const adminProductQuerySchema = productQuerySchema.extend({
  status: z
    .enum(ProductStatus)
    .optional()
    .describe('Omit to see products in every status'),
});

export class AdminProductQueryDto extends createZodDto(
  adminProductQuerySchema,
) {}
