// src/brands/dto/brand-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';
import { booleanQuerySchema } from '@/common/utils/zod-boolean-query.util';

export const brandQuerySchema = cursorPaginationQuerySchema.extend({
  isActive: booleanQuerySchema().optional().describe('Filter by active status'),
});

export class BrandQueryDto extends createZodDto(brandQuerySchema) {}
