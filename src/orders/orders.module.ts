// src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { CouponsModule } from '@/coupons/coupons.module';
import { InventoryModule } from '@/inventory/inventory.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [InventoryModule, CouponsModule, NotificationsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
