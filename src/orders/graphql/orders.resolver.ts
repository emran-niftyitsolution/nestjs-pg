// src/orders/graphql/orders.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { Role } from '@/common/enums/role.enum';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { RolesGuard } from '@/common/guards/roles.guard';
import { OrdersService } from '../orders.service';
import { CheckoutInput } from './checkout.input';
import { OrderModel } from './order.model';
import { OrderQueryArgs } from './order-query.args';

const OrderCursorPage = CursorPaginatedType(OrderModel);

@Resolver(() => OrderModel)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Mutation(() => OrderModel, {
    description: 'Place an order from my current cart',
  })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CheckoutInput,
  ) {
    return this.ordersService.checkout(user.id, input);
  }

  @Query(() => OrderCursorPage, { name: 'orders' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Args() query: OrderQueryArgs,
  ) {
    return this.ordersService.findAllForUser(user.id, query);
  }

  @Query(() => OrderModel, { name: 'order' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.ordersService.findOneForUser(user.id, id);
  }

  @Mutation(() => OrderModel, {
    description: 'Cancel one of my orders (only while still pending)',
  })
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.ordersService.cancelOwnOrder(user.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => OrderCursorPage, { name: 'adminOrders' })
  findAllAdmin(@Args() query: OrderQueryArgs) {
    return this.ordersService.findAllAdmin(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => OrderModel, { name: 'adminOrder' })
  findOneAdmin(@Args('id', { type: () => ID }) id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => OrderModel, {
    description:
      'Move an order to a new status (validated against its state machine)',
  })
  updateOrderStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status', { type: () => OrderStatus }) status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }
}
