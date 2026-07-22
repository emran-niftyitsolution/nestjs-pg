// src/modules/categories/dto/create-category.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message: 'slug must be lowercase alphanumeric, hyphen-separated',
    })
    .optional()
    .describe('URL-friendly identifier; derived from the name if omitted'),
  description: z.string().optional(),
  parentId: z
    .uuid()
    .optional()
    .describe('Parent category id — omit to create a top-level category'),
  sortOrder: z.number().int().min(0).optional(),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
