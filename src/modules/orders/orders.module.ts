// src/modules/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersResolver } from './graphql/orders.resolver';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [InventoryModule, CouponsModule, NotificationsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersResolver],
  exports: [OrdersService],
})
export class OrdersModule {}
