// src/product-images/product-images.module.ts

import { Module } from '@nestjs/common';
import { ProductsModule } from '@/products/products.module';
import { AdminProductImagesController } from './admin-product-images.controller';
import { ProductImagesController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';

@Module({
  imports: [ProductsModule],
  controllers: [ProductImagesController, AdminProductImagesController],
  providers: [ProductImagesService],
  exports: [ProductImagesService],
})
export class ProductImagesModule {}
