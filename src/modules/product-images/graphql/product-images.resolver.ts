// src/product-images/graphql/product-images.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ProductImagesService } from '../product-images.service';
import { CreateProductImageInput } from './create-product-image.input';
import { ProductImageModel } from './product-image.model';
import { UpdateProductImageInput } from './update-product-image.input';

@Resolver(() => ProductImageModel)
export class ProductImagesResolver {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Public()
  @Query(() => [ProductImageModel], { name: 'productImages' })
  findAll(@Args('productId', { type: () => ID }) productId: string) {
    return this.productImagesService.findAllPublic(productId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => [ProductImageModel], { name: 'adminProductImages' })
  findAllAdmin(@Args('productId', { type: () => ID }) productId: string) {
    return this.productImagesService.findAllAdmin(productId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => ProductImageModel)
  createProductImage(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('input') input: CreateProductImageInput,
  ) {
    return this.productImagesService.create(productId, input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => ProductImageModel)
  updateProductImage(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('imageId', { type: () => ID }) imageId: string,
    @Args('input') input: UpdateProductImageInput,
  ) {
    return this.productImagesService.update(productId, imageId, input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => ProductImageModel)
  removeProductImage(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('imageId', { type: () => ID }) imageId: string,
  ) {
    return this.productImagesService.remove(productId, imageId);
  }
}
