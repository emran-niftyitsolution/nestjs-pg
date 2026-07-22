// src/payments/graphql/payment.model.ts

import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import './payment.enums';

@ObjectType('Payment')
export class PaymentModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  orderId!: string;

  @Field(() => PaymentProvider)
  provider!: PaymentProvider;

  @Field(() => PaymentStatus)
  status!: PaymentStatus;

  @Field(() => Float)
  amount!: number;

  @Field(() => String, { nullable: true })
  transactionReference!: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  gatewayResponse!: Record<string, unknown> | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
