// src/modules/brands/graphql/brands.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import { RolesGuard } from '@/common/guards/roles.guard';
import { BrandsService } from '../brands.service';
import { BrandModel } from './brand.model';
import { CreateBrandInput } from './create-brand.input';
import { UpdateBrandInput } from './update-brand.input';

const BrandCursorPage = CursorPaginatedType(BrandModel);

@Resolver(() => BrandModel)
export class BrandsResolver {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Query(() => BrandCursorPage, { name: 'brands' })
  findAll(
    @Args() { limit, cursor }: CursorPaginationArgs,
    @Args('isActive', { nullable: true }) isActive?: boolean,
  ) {
    return this.brandsService.findAll({ limit, cursor, isActive });
  }

  @Public()
  @Query(() => BrandModel, { name: 'brand' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.brandsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => BrandModel)
  createBrand(@Args('input') input: CreateBrandInput) {
    return this.brandsService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => BrandModel)
  updateBrand(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateBrandInput,
  ) {
    return this.brandsService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => BrandModel)
  removeBrand(@Args('id', { type: () => ID }) id: string) {
    return this.brandsService.remove(id);
  }
}
