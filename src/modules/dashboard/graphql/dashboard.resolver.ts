// src/dashboard/graphql/dashboard.resolver.ts

import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { DashboardService } from '../dashboard.service';
import {
  DashboardSummaryModel,
  LowStockProductModel,
  MonthlySalesModel,
  TopCategoryModel,
  TopProductModel,
} from './dashboard.model';

@UseGuards(RolesGuard)
@Roles(Role.Admin)
@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardSummaryModel, {
    name: 'dashboardSummary',
    description: 'Total revenue, orders, products, and customers',
  })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Query(() => [TopProductModel], {
    name: 'topProducts',
    description: 'Best-selling products by revenue',
  })
  getTopProducts(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ) {
    return this.dashboardService.getTopProducts(limit);
  }

  @Query(() => [TopCategoryModel], {
    name: 'topCategories',
    description: 'Best-selling categories by revenue',
  })
  getTopCategories(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ) {
    return this.dashboardService.getTopCategories(limit);
  }

  @Query(() => [MonthlySalesModel], {
    name: 'monthlySales',
    description: 'Revenue and order count by month, most recent first',
  })
  getMonthlySales(
    @Args('months', { type: () => Int, defaultValue: 12 }) months: number,
  ) {
    return this.dashboardService.getMonthlySales(months);
  }

  @Query(() => [LowStockProductModel], {
    name: 'lowStockProducts',
    description: 'Active products at or below a stock threshold',
  })
  getLowStock(
    @Args('threshold', { type: () => Int, defaultValue: 10 }) threshold: number,
  ) {
    return this.dashboardService.getLowStock(threshold);
  }
}
