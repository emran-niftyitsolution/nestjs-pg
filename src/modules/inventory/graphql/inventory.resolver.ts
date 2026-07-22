// src/modules/inventory/graphql/inventory.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { InventoryService } from '../inventory.service';
import { InventorySummaryModel } from './inventory-summary.model';

@Resolver(() => InventorySummaryModel)
export class InventoryResolver {
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Query(() => InventorySummaryModel, { name: 'inventorySummary' })
  getSummary(@Args('productId', { type: () => ID }) productId: string) {
    return this.inventoryService.getSummary(productId);
  }
}
