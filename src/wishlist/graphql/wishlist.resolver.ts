// src/wishlist/graphql/wishlist.resolver.ts

import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/current-user.decorator';
import { WishlistService } from '../wishlist.service';
import { WishlistItemModel } from './wishlist-item.model';

@Resolver(() => WishlistItemModel)
export class WishlistResolver {
  constructor(private readonly wishlistService: WishlistService) {}

  @Query(() => [WishlistItemModel], { name: 'wishlist' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.findAllForUser(user.id);
  }

  @Mutation(() => Boolean, {
    description: 'Save a product (idempotent — re-saving is a no-op)',
  })
  async addToWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Args('productId', { type: () => ID }) productId: string,
  ) {
    await this.wishlistService.add(user.id, productId);
    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Un-save a product (idempotent — a no-op if not saved)',
  })
  async removeFromWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Args('productId', { type: () => ID }) productId: string,
  ) {
    await this.wishlistService.remove(user.id, productId);
    return true;
  }
}
