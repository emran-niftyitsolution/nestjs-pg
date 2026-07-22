// src/cart/graphql/cart-item.input.ts

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class AddCartItemInput {
  @Field(() => ID)
  productId!: string;

  @Field(() => Int)
  quantity!: number;
}

@InputType()
export class UpdateCartItemInput {
  @Field(() => Int, { description: 'Sets the exact quantity (not a delta)' })
  quantity!: number;
}
