// src/modules/addresses/dto/address-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const addressResponseSchema = z.object({
  id: z.uuid(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
  isDefault: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class AddressResponseDto extends createZodDto(addressResponseSchema) {}
