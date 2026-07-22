// src/modules/addresses/graphql/address.model.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Address')
export class AddressModel {
  @Field(() => ID)
  id!: string;

  @Field()
  street!: string;

  @Field()
  city!: string;

  @Field()
  state!: string;

  @Field()
  postalCode!: string;

  @Field()
  country!: string;

  @Field()
  isDefault!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
