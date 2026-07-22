// src/coupons/dto/coupon-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CouponType } from '@/common/enums/coupon-type.enum';

export const couponResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  type: z.enum(CouponType),
  value: z.number(),
  minPurchase: z.number(),
  usageLimit: z.number().nullable(),
  usageCount: z.number(),
  expiresAt: z.iso.datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CouponResponseDto extends createZodDto(couponResponseSchema) {}
