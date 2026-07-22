// src/modules/cart/graphql/cart.resolver.ts

import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CartService } from '../cart.service';
import { CartModel } from './cart.model';
import { AddCartItemInput, UpdateCartItemInput } from './cart-item.input';

@Resolver(() => CartModel)
export class CartResolver {
  constructor(private readonly cartService: CartService) {}

  @Query(() => CartModel, { name: 'cart' })
  getCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.id);
  }

  @Mutation(() => CartModel)
  addCartItem(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: AddCartItemInput,
  ) {
    return this.cartService.addItem(user.id, input);
  }

  @Mutation(() => CartModel)
  updateCartItem(
    @CurrentUser() user: AuthenticatedUser,
    @Args('itemId', { type: () => ID }) itemId: string,
    @Args('input') input: UpdateCartItemInput,
  ) {
    return this.cartService.updateItem(user.id, itemId, input);
  }

  @Mutation(() => CartModel)
  removeCartItem(
    @CurrentUser() user: AuthenticatedUser,
    @Args('itemId', { type: () => ID }) itemId: string,
  ) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Mutation(() => CartModel)
  clearCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.clearCart(user.id);
  }
}
