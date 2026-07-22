// src/products/graphql/product.model.ts

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { ProductStatus } from '@/common/enums/product-status.enum';
import './product.enums';
import { ProductDimensionsModel } from './product-dimensions.model';

@ObjectType('Product')
export class ProductModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field()
  sku!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int, { nullable: true })
  discountPercentage!: number | null;

  @Field(() => Float, {
    description: 'price with discountPercentage applied, rounded to 2dp',
  })
  finalPrice!: number;

  @Field(() => Int)
  stock!: number;

  @Field(() => Float, { nullable: true })
  weightKg!: number | null;

  @Field(() => ProductDimensionsModel, { nullable: true })
  dimensionsCm!: ProductDimensionsModel | null;

  @Field(() => GraphQLJSON)
  specifications!: Record<string, unknown>;

  @Field(() => ID)
  categoryId!: string;

  @Field(() => ID, { nullable: true })
  brandId!: string | null;

  @Field(() => ProductStatus)
  status!: ProductStatus;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
