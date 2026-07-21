// src/coupons/dto/update-coupon.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createCouponSchema } from './create-coupon.dto';

export const updateCouponSchema = createCouponSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export class UpdateCouponDto extends createZodDto(updateCouponSchema) {}
