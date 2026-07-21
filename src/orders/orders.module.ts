// src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { CouponsModule } from '@/coupons/coupons.module';
import { InventoryModule } from '@/inventory/inventory.module';
import { NotificationsModule } from '@/notifications/notifications.module';
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
