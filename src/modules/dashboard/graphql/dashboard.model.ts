// src/modules/dashboard/graphql/dashboard.model.ts

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('DashboardSummary')
export class DashboardSummaryModel {
  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Int)
  totalOrders!: number;

  @Field(() => Int)
  totalProducts!: number;

  @Field(() => Int)
  totalCustomers!: number;
}

@ObjectType('TopProduct')
export class TopProductModel {
  @Field(() => Int, { description: 'Rank by revenue, 1 = highest' })
  rank!: number;

  @Field(() => ID)
  productId!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => Int)
  unitsSold!: number;

  @Field(() => Float)
  revenue!: number;
}

@ObjectType('TopCategory')
export class TopCategoryModel {
  @Field(() => Int, { description: 'Rank by revenue, 1 = highest' })
  rank!: number;

  @Field(() => ID)
  categoryId!: string;

  @Field()
  name!: string;

  @Field(() => Int)
  unitsSold!: number;

  @Field(() => Float)
  revenue!: number;
}

@ObjectType('MonthlySales')
export class MonthlySalesModel {
  @Field()
  month!: string;

  @Field(() => Int)
  orderCount!: number;

  @Field(() => Float)
  revenue!: number;
}

@ObjectType('LowStockProduct')
export class LowStockProductModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  sku!: string;

  @Field(() => Int)
  stock!: number;

  @Field(() => ID, { nullable: true })
  categoryId!: string | null;
}
