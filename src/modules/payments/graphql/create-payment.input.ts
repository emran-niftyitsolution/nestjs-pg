// src/modules/payments/graphql/create-payment.input.ts

import { Field, InputType } from '@nestjs/graphql';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';
import './payment.enums';

@InputType()
export class CreatePaymentInput {
  @Field(() => PaymentProvider)
  provider!: PaymentProvider;

  @Field({
    nullable: true,
    description:
      'Mock-only: force the simulated gateway call to fail, so the failure path can be exercised deterministically instead of leaving it untestable.',
  })
  simulateFailure?: boolean;
}
