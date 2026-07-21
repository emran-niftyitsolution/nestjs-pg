// src/payments/graphql/payment-query.args.ts

import { ArgsType, Field } from '@nestjs/graphql';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import './payment.enums';

@ArgsType()
export class PaymentQueryArgs extends CursorPaginationArgs {
  @Field(() => PaymentStatus, { nullable: true })
  status?: PaymentStatus;
}
