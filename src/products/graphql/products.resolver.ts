// src/products/graphql/products.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ProductsService } from '../products.service';
import { CreateProductInput } from './create-product.input';
import { ProductModel } from './product.model';
import { AdminProductQueryArgs, ProductQueryArgs } from './product-query.args';
import { UpdateProductInput } from './update-product.input';

const ProductCursorPage = CursorPaginatedType(ProductModel);

@Resolver(() => ProductModel)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  // Public catalog browse — only ever surfaces `active` products.
  @Public()
  @Query(() => ProductCursorPage, { name: 'products' })
  findAll(@Args() query: ProductQueryArgs) {
    return this.productsService.findAllPublic(query);
  }

  @Public()
  @Query(() => ProductModel, { name: 'product' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOnePublic(id);
  }

  @Public()
  @Query(() => ProductModel, { name: 'productBySlug' })
  findBySlug(@Args('slug') slug: string) {
    return this.productsService.findBySlugPublic(slug);
  }

  // Admin surface — sees every status.
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => ProductCursorPage, { name: 'adminProducts' })
  findAllAdmin(@Args() query: AdminProductQueryArgs) {
    return this.productsService.findAllAdmin(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => ProductModel, { name: 'adminProduct' })
  findOneAdmin(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => ProductModel)
  createProduct(@Args('input') input: CreateProductInput) {
    return this.productsService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => ProductModel)
  updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProductInput,
  ) {
    return this.productsService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => ProductModel)
  removeProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.remove(id);
  }
}
