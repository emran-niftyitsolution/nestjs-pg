// src/coupons/graphql/update-coupon.input.ts

import { InputType, PartialType } from '@nestjs/graphql';
import { CreateCouponInput } from './create-coupon.input';

@InputType()
export class UpdateCouponInput extends PartialType(CreateCouponInput) {}
