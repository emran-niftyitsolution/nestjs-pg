// src/coupons/graphql/create-coupon.input.ts

import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { CouponType } from '@/common/enums/coupon-type.enum';
import './coupon.enums';

@InputType()
export class CreateCouponInput {
  @Field({ description: 'Case-insensitive' })
  code!: string;

  @Field(() => CouponType)
  type!: CouponType;

  @Field(() => Float, {
    description:
      'Percentage (0-100] if type=percentage, currency amount if type=flat',
  })
  value!: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Defaults to 0 if omitted',
  })
  minPurchase?: number;

  @Field(() => Int, { nullable: true, description: 'Omit for unlimited uses' })
  usageLimit?: number;

  @Field({
    nullable: true,
    description: 'Omit for a coupon that never expires',
  })
  expiresAt?: string;
}
