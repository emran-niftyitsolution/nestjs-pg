// src/product-images/graphql/create-product-image.input.ts

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateProductImageInput {
  @Field()
  url!: string;

  @Field({ nullable: true })
  altText?: string;

  @Field(() => Int, { nullable: true })
  sortOrder?: number;
}
