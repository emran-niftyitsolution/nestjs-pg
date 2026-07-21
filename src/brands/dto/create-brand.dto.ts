// src/brands/dto/create-brand.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createBrandSchema = z.object({
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
  logoUrl: z.url().optional().describe('URL to the brand logo image'),
  website: z.url().max(255).optional().describe("Brand's official website"),
});

export class CreateBrandDto extends createZodDto(createBrandSchema) {}
