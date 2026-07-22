// src/wishlist/wishlist.module.ts

import { Module } from '@nestjs/common';
import { WishlistResolver } from './graphql/wishlist.resolver';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  controllers: [WishlistController],
  providers: [WishlistService, WishlistResolver],
  exports: [WishlistService],
})
export class WishlistModule {}
