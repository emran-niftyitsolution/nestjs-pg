// src/modules/inventory/inventory.module.ts

import { Module } from '@nestjs/common';
import { AdminInventoryController } from './admin-inventory.controller';
import { InventoryResolver } from './graphql/inventory.resolver';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [AdminInventoryController],
  providers: [InventoryService, InventoryResolver],
  exports: [InventoryService],
})
export class InventoryModule {}
