// src/modules/coupons/dto/coupon-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';
import { booleanQuerySchema } from '@/common/utils/zod-boolean-query.util';

export const couponQuerySchema = cursorPaginationQuerySchema.extend({
  isActive: booleanQuerySchema().optional().describe('Filter by active status'),
});

export class CouponQueryDto extends createZodDto(couponQuerySchema) {}
