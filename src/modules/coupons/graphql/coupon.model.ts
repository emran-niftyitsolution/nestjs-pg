// src/modules/coupons/graphql/coupon.model.ts

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { CouponType } from '@/common/enums/coupon-type.enum';
import './coupon.enums';

@ObjectType('Coupon')
export class CouponModel {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'Case-insensitive' })
  code!: string;

  @Field(() => CouponType)
  type!: CouponType;

  @Field(() => Float)
  value!: number;

  @Field(() => Float)
  minPurchase!: number;

  @Field(() => Int, { nullable: true })
  usageLimit!: number | null;

  @Field(() => Int)
  usageCount!: number;

  @Field(() => Date, { nullable: true })
  expiresAt!: Date | null;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

// validate() stringifies dates before returning (see CouponsService.validate),
// so this mirrors that shape rather than reusing CouponModel's Date fields.
@ObjectType('ValidatedCoupon')
export class ValidatedCouponModel {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'Case-insensitive' })
  code!: string;

  @Field(() => CouponType)
  type!: CouponType;

  @Field(() => Float)
  value!: number;

  @Field(() => Float)
  minPurchase!: number;

  @Field(() => Int, { nullable: true })
  usageLimit!: number | null;

  @Field(() => Int)
  usageCount!: number;

  @Field(() => String, { nullable: true })
  expiresAt!: string | null;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('CouponValidation')
export class CouponValidationModel {
  @Field(() => ValidatedCouponModel)
  coupon!: ValidatedCouponModel;

  @Field(() => Float, {
    description: 'Amount to subtract from purchaseAmount',
  })
  discountAmount!: number;
}
