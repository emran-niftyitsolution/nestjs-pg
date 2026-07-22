// src/modules/cart/cart.module.ts

import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartResolver } from './graphql/cart.resolver';

@Module({
  controllers: [CartController],
  providers: [CartService, CartResolver],
  exports: [CartService],
})
export class CartModule {}
