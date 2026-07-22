// src/modules/payments/graphql/payments.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Roles } from '@/common/decorators/roles.decorator';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { Role } from '@/common/enums/role.enum';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { PaymentsService } from '../payments.service';
import { CreatePaymentInput } from './create-payment.input';
import { PaymentModel } from './payment.model';
import { PaymentQueryArgs } from './payment-query.args';

const PaymentCursorPage = CursorPaginatedType(PaymentModel);

@Resolver(() => PaymentModel)
export class PaymentsResolver {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Mutation(() => PaymentModel, {
    description: 'Pay for one of my pending orders',
  })
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Args('orderId', { type: () => ID }) orderId: string,
    @Args('input') input: CreatePaymentInput,
  ) {
    return this.paymentsService.pay(user.id, orderId, input);
  }

  @Query(() => [PaymentModel], { name: 'orderPayments' })
  findAllForOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Args('orderId', { type: () => ID }) orderId: string,
  ) {
    return this.paymentsService.findAllForOrder(user.id, orderId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => PaymentCursorPage, { name: 'adminPayments' })
  findAllAdmin(@Args() query: PaymentQueryArgs) {
    return this.paymentsService.findAllAdmin(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => PaymentModel, { name: 'adminPayment' })
  findOneAdmin(@Args('id', { type: () => ID }) id: string) {
    return this.paymentsService.findOneAdmin(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => PaymentModel, {
    description:
      'Move a payment to a new status (e.g. confirm a cash payment, or refund a successful one). Drives the linked order through the same transition.',
  })
  updatePaymentStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status', { type: () => PaymentStatus }) status: PaymentStatus,
  ) {
    return this.paymentsService.updateStatus(id, status);
  }
}
