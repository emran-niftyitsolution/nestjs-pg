// src/modules/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { OrdersModule } from '@/modules/orders/orders.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentsResolver } from './graphql/payments.resolver';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, PaymentsResolver],
  exports: [PaymentsService],
})
export class PaymentsModule {}
