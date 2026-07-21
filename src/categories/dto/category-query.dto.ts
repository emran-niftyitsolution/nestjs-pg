// src/categories/dto/category-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';
import { booleanQuerySchema } from '@/common/utils/zod-boolean-query.util';

export const categoryQuerySchema = cursorPaginationQuerySchema.extend({
  parentId: z
    .uuid()
    .optional()
    .describe('Return only direct children of this category'),
  topLevelOnly: booleanQuerySchema()
    .optional()
    .describe('Return only top-level (root) categories'),
});

export class CategoryQueryDto extends createZodDto(categoryQuerySchema) {}
