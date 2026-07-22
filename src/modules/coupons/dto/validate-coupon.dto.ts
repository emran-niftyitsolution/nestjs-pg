// src/modules/coupons/dto/validate-coupon.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  purchaseAmount: z
    .number()
    .min(0)
    .describe("The order's subtotal before discount"),
});

export class ValidateCouponDto extends createZodDto(validateCouponSchema) {}
