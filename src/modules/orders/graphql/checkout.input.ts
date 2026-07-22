// src/modules/orders/graphql/checkout.input.ts

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CheckoutInput {
  @Field(() => ID, { description: 'One of your own addresses to ship to' })
  addressId!: string;

  @Field({ nullable: true })
  couponCode?: string;
}
