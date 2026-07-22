// src/modules/addresses/dto/create-address.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAddressSchema = z.object({
  street: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  isDefault: z
    .boolean()
    .optional()
    .describe(
      'Make this the default address. Automatically true if this is your first address.',
    ),
});

export class CreateAddressDto extends createZodDto(createAddressSchema) {}
