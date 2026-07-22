// src/modules/coupons/graphql/coupon.enums.ts

import { registerEnumType } from '@nestjs/graphql';
import { CouponType } from '@/common/enums/coupon-type.enum';

registerEnumType(CouponType, { name: 'CouponType' });
