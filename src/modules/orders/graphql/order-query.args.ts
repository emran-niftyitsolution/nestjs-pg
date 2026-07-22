// src/modules/orders/graphql/order-query.args.ts

import { ArgsType, Field } from '@nestjs/graphql';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import './order.enums';

@ArgsType()
export class OrderQueryArgs extends CursorPaginationArgs {
  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;
}
