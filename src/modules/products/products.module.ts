// src/products/products.module.ts

import { Module } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { ProductsResolver } from './graphql/products.resolver';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, ProductsResolver],
  exports: [ProductsService],
})
export class ProductsModule {}
