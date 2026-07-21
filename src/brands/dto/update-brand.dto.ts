// src/brands/dto/update-brand.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createBrandSchema } from './create-brand.dto';

export const updateBrandSchema = createBrandSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export class UpdateBrandDto extends createZodDto(updateBrandSchema) {}
