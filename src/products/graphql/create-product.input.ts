// src/products/graphql/create-product.input.ts

import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { ProductStatus } from '@/common/enums/product-status.enum';
import './product.enums';
import { ProductDimensionsInput } from './product-dimensions.model';

@InputType()
export class CreateProductInput {
  @Field()
  name!: string;

  @Field({
    nullable: true,
    description: 'URL-friendly identifier; derived from the name if omitted',
  })
  slug?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ description: 'Stock keeping unit' })
  sku!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int, { nullable: true })
  discountPercentage?: number;

  @Field(() => Int, { nullable: true })
  stock?: number;

  @Field(() => Float, { nullable: true, description: 'Weight in kilograms' })
  weightKg?: number;

  @Field(() => ProductDimensionsInput, { nullable: true })
  dimensionsCm?: ProductDimensionsInput;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Arbitrary product attributes, e.g. { "ram": "16GB", "color": "black" }',
  })
  specifications?: Record<string, unknown>;

  @Field(() => ID)
  categoryId!: string;

  @Field(() => ID, { nullable: true })
  brandId?: string;

  @Field(() => ProductStatus, { nullable: true })
  status?: ProductStatus;
}
