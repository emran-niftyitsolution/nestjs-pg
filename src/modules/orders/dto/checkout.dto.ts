// src/orders/dto/checkout.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const checkoutSchema = z.object({
  addressId: z.uuid().describe('One of your own addresses to ship to'),
  couponCode: z.string().optional(),
});

export class CheckoutDto extends createZodDto(checkoutSchema) {}
