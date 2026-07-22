// src/brands/dto/brand-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const brandResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  website: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class BrandResponseDto extends createZodDto(brandResponseSchema) {}
