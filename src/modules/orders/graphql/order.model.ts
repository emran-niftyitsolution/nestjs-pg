// src/modules/orders/graphql/order.model.ts

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { OrderStatus } from '@/common/enums/order-status.enum';
import './order.enums';

@ObjectType('ShippingAddressSnapshot')
export class ShippingAddressSnapshotModel {
  @Field()
  street!: string;

  @Field()
  city!: string;

  @Field()
  state!: string;

  @Field()
  postalCode!: string;

  @Field()
  country!: string;
}

@ObjectType('OrderItem')
export class OrderItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  productId!: string;

  @Field()
  productName!: string;

  @Field()
  productSku!: string;

  @Field(() => Float)
  unitPrice!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  taxAmount!: number;

  @Field(() => Float)
  lineTotal!: number;
}

@ObjectType('Order')
export class OrderModel {
  @Field(() => ID)
  id!: string;

  @Field(() => OrderStatus)
  status!: OrderStatus;

  @Field(() => Float)
  subtotal!: number;

  @Field(() => Float)
  discountAmount!: number;

  @Field(() => String, { nullable: true })
  couponCode!: string | null;

  @Field(() => ShippingAddressSnapshotModel)
  shippingAddress!: ShippingAddressSnapshotModel;

  @Field(() => Float)
  total!: number;

  @Field(() => [OrderItemModel])
  items!: OrderItemModel[];

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}
