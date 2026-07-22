// src/modules/categories/graphql/categories.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CategoriesService } from '../categories.service';
import { CategoryModel, CategoryTreeNodeModel } from './category.model';
import { CreateCategoryInput } from './create-category.input';
import { UpdateCategoryInput } from './update-category.input';

const CategoryCursorPage = CursorPaginatedType(CategoryModel);

@Resolver(() => CategoryModel)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Query(() => CategoryCursorPage, { name: 'categories' })
  findAll(
    @Args() { limit, cursor }: CursorPaginationArgs,
    @Args('parentId', { type: () => ID, nullable: true }) parentId?: string,
    @Args('topLevelOnly', { nullable: true }) topLevelOnly?: boolean,
  ) {
    return this.categoriesService.findAll({
      limit,
      cursor,
      parentId,
      topLevelOnly,
    });
  }

  @Public()
  @Query(() => [CategoryTreeNodeModel], { name: 'categoryTree' })
  findTree() {
    return this.categoriesService.findTree();
  }

  @Public()
  @Query(() => CategoryModel, { name: 'category' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Public()
  @Query(() => [CategoryModel], { name: 'categoryAncestors' })
  findAncestors(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.findAncestors(id);
  }

  @Public()
  @Query(() => [CategoryTreeNodeModel], { name: 'categoryDescendants' })
  findDescendants(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.findDescendants(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => CategoryModel)
  createCategory(@Args('input') input: CreateCategoryInput) {
    return this.categoriesService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => CategoryModel)
  updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCategoryInput,
  ) {
    return this.categoriesService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => CategoryModel)
  removeCategory(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.remove(id);
  }
}
