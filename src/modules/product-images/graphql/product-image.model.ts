// src/modules/product-images/graphql/product-image.model.ts

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('ProductImage')
export class ProductImageModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  productId!: string;

  @Field()
  url!: string;

  @Field(() => String, { nullable: true })
  altText!: string | null;

  @Field(() => Int)
  sortOrder!: number;

  @Field()
  createdAt!: Date;
}
