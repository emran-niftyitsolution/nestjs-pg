// src/inventory/graphql/inventory-summary.model.ts

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('InventorySummary')
export class InventorySummaryModel {
  @Field(() => ID)
  productId!: string;

  @Field(() => Int, { description: 'products.stock — the on-hand total' })
  stock!: number;

  @Field(() => Int)
  reservedStock!: number;

  @Field(() => Int)
  soldStock!: number;

  @Field(() => Int, { description: 'stock - reservedStock' })
  availableStock!: number;
}
