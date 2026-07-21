// src/categories/dto/category-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parentId: z.uuid().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CategoryResponseDto extends createZodDto(categoryResponseSchema) {}
