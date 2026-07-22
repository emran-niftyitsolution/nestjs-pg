// src/modules/coupons/dto/create-coupon.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CouponType } from '@/common/enums/coupon-type.enum';

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, {
      message:
        'code may only contain letters, numbers, hyphens, and underscores',
    })
    .describe('Case-insensitive'),
  type: z.enum(CouponType),
  value: z
    .number()
    .min(0.01)
    .describe(
      'Percentage (0-100] if type=percentage, currency amount if type=flat — the upper bound for percentage is enforced by CouponsService, not here (a plain @Max would apply to flat coupons too)',
    ),
  minPurchase: z
    .number()
    .min(0)
    .optional()
    .describe('Defaults to 0 if omitted'),
  usageLimit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Omit for unlimited uses'),
  expiresAt: z
    .union([z.iso.datetime({ offset: true, local: true }), z.iso.date()])
    .optional()
    .describe('Omit for a coupon that never expires'),
});

export class CreateCouponDto extends createZodDto(createCouponSchema) {}
