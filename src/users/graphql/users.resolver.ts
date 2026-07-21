// src/users/graphql/users.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import '@/common/graphql/role.enum';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UsersService } from '../users.service';
import { UpdateUserInput } from './update-user.input';
import { UserModel } from './user.model';

const UserCursorPage = CursorPaginatedType(UserModel);

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserModel, { name: 'me' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Mutation(() => UserModel)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(user.id, input);
  }

  @Mutation(() => UserModel)
  removeMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => UserCursorPage, { name: 'users' })
  findAll(@Args() { limit, cursor }: CursorPaginationArgs) {
    return this.usersService.findAll({ limit, cursor });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => UserModel, { name: 'user' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => UserModel)
  updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => UserModel)
  updateUserRole(
    @Args('id', { type: () => ID }) id: string,
    @Args('role', { type: () => Role }) role: Role,
  ) {
    return this.usersService.updateRole(id, role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Mutation(() => UserModel)
  removeUser(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.remove(id);
  }
}
