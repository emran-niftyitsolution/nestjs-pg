// src/modules/addresses/graphql/create-address.input.ts

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateAddressInput {
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

  @Field({
    nullable: true,
    description:
      'Make this the default address. Automatically true if this is your first address.',
  })
  isDefault?: boolean;
}
