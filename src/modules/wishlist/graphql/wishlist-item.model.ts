// src/modules/wishlist/graphql/wishlist-item.model.ts

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('WishlistItem')
export class WishlistItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  productId!: string;

  @Field()
  productName!: string;

  @Field()
  productSlug!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  stock!: number;

  @Field()
  createdAt!: string;
}
