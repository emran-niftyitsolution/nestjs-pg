// src/modules/addresses/graphql/addresses.resolver.ts

import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { AddressesService } from '../addresses.service';
import { AddressModel } from './address.model';
import { CreateAddressInput } from './create-address.input';
import { UpdateAddressInput } from './update-address.input';

@Resolver(() => AddressModel)
export class AddressesResolver {
  constructor(private readonly addressesService: AddressesService) {}

  @Query(() => [AddressModel], { name: 'addresses' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findAllForUser(user.id);
  }

  @Query(() => AddressModel, { name: 'address' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.addressesService.findOne(user.id, id);
  }

  @Mutation(() => AddressModel)
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateAddressInput,
  ) {
    return this.addressesService.create(user.id, input);
  }

  @Mutation(() => AddressModel)
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAddressInput,
  ) {
    return this.addressesService.update(user.id, id, input);
  }

  @Mutation(() => AddressModel)
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.addressesService.setDefault(user.id, id);
  }

  @Mutation(() => AddressModel)
  removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.addressesService.remove(user.id, id);
  }
}
