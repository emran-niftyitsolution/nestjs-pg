// src/cart/graphql/cart.model.ts

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('CartItem')
export class CartItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  productId!: string;

  @Field()
  productName!: string;

  @Field()
  productSlug!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float, {
    description: 'Price when this line was last added to/updated',
  })
  priceSnapshot!: number;

  @Field(() => Float, {
    description: "The product's current price, for comparison",
  })
  currentPrice!: number;

  @Field(() => Float, { description: 'quantity * priceSnapshot' })
  lineTotal!: number;
}

@ObjectType('Cart')
export class CartModel {
  @Field(() => ID)
  id!: string;

  @Field(() => [CartItemModel])
  items!: CartItemModel[];

  @Field(() => Int, { description: 'Sum of quantity across all lines' })
  itemCount!: number;

  @Field(() => Float, { description: 'Sum of lineTotal across all lines' })
  subtotal!: number;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}
