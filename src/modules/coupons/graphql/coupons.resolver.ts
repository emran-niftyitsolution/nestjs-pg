// src/modules/coupons/graphql/coupons.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, Float, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CouponsService } from '../coupons.service';
import { CouponModel, CouponValidationModel } from './coupon.model';
import { CreateCouponInput } from './create-coupon.input';
import { UpdateCouponInput } from './update-coupon.input';

const CouponCursorPage = CursorPaginatedType(CouponModel);

@Resolver(() => CouponModel)
export class CouponsResolver {
  constructor(private readonly couponsService: CouponsService) {}

  // Read-only — does not consume a use. Redemption happens server-side as
  // part of checkout, so this is a Query rather than a Mutation.
  @Query(() => CouponValidationModel, {
    name: 'validateCoupon',
    description:
      'Check whether a coupon code is usable and what it would discount',
  })
  validate(
    @Args('code') code: string,
    @Args('purchaseAmount', { type: () => Float }) purchaseAmount: number,
  ) {
    return this.couponsService.validate(code, purchaseAmount);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => CouponCursorPage, { name: 'coupons' })
  findAll(
    @Args() { limit, cursor }: CursorPaginationArgs,
    @Args('isActive', { nullable: true }) isActive?: boolean,
  ) {
    return this.couponsService.findAll({ limit, cursor, isActive });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => CouponModel, { name: 'coupon' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.couponsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => CouponModel)
  createCoupon(@Args('input') input: CreateCouponInput) {
    return this.couponsService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => CouponModel)
  updateCoupon(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCouponInput,
  ) {
    return this.couponsService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => CouponModel)
  removeCoupon(@Args('id', { type: () => ID }) id: string) {
    return this.couponsService.remove(id);
  }
}
