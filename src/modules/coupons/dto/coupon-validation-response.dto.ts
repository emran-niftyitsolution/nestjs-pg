// src/modules/coupons/dto/coupon-validation-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { couponResponseSchema } from './coupon-response.dto';

export const couponValidationResponseSchema = z.object({
  coupon: couponResponseSchema,
  discountAmount: z.number().describe('Amount to subtract from purchaseAmount'),
});

export class CouponValidationResponseDto extends createZodDto(
  couponValidationResponseSchema,
) {}
