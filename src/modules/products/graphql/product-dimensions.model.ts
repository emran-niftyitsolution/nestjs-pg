// src/products/graphql/product-dimensions.model.ts

import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType('ProductDimensions')
export class ProductDimensionsModel {
  @Field(() => Float)
  length!: number;

  @Field(() => Float)
  width!: number;

  @Field(() => Float)
  height!: number;
}

@InputType('ProductDimensionsInput')
export class ProductDimensionsInput {
  @Field(() => Float)
  length!: number;

  @Field(() => Float)
  width!: number;

  @Field(() => Float)
  height!: number;
}
