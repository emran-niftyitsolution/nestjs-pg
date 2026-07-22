// src/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { count, desc, eq, inArray, lte, sql, sum } from 'drizzle-orm';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { Role } from '@/common/enums/role.enum';
import { DatabaseService } from '@/database/database.service';
import {
  bestSellingProductsView,
  categories,
  lowStockProductsView,
  monthlySalesView,
  orderItems,
  orders,
  products,
  users,
} from '@/database/schema';
import type { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import type { LowStockProductResponseDto } from './dto/low-stock-product-response.dto';
import type { MonthlySalesResponseDto } from './dto/monthly-sales-response.dto';
import type { TopCategoryResponseDto } from './dto/top-category-response.dto';
import type { TopProductResponseDto } from './dto/top-product-response.dto';

// The same "which orders actually represent revenue" filter as the views
// (dashboard-views.schema.ts) — repeated here rather than imported because
// it's an array for `inArray`, not a raw SQL fragment.
const REVENUE_STATUSES = [
  OrderStatus.Paid,
  OrderStatus.Processing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Refunded,
];

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /** Three independent aggregates — run as separate queries in parallel rather than joined/CTE'd together, since they don't share a FROM clause. */
  async getSummary(): Promise<DashboardSummaryResponseDto> {
    const [[orderStats], [productStats], [customerStats]] = await Promise.all([
      this.db
        .select({
          totalOrders: count(),
          totalRevenue: sum(orders.total),
        })
        .from(orders)
        .where(inArray(orders.status, REVENUE_STATUSES)),
      this.db.select({ totalProducts: count() }).from(products),
      this.db
        .select({ totalCustomers: count() })
        .from(users)
        .where(eq(users.role, Role.Customer)),
    ]);

    return {
      totalRevenue: Number(orderStats.totalRevenue),
      totalOrders: orderStats.totalOrders,
      totalProducts: productStats.totalProducts,
      totalCustomers: customerStats.totalCustomers,
    };
  }

  /** Reads from best_selling_products_view; RANK() is applied here rather than baked into the view, since ranking is a presentation concern the view's consumers should get to choose (top 10 vs top 100, etc). */
  async getTopProducts(limit: number): Promise<TopProductResponseDto[]> {
    return this.db
      .select({
        productId: bestSellingProductsView.productId,
        name: bestSellingProductsView.name,
        slug: bestSellingProductsView.slug,
        unitsSold: bestSellingProductsView.unitsSold,
        revenue: bestSellingProductsView.revenue,
        rank: sql<number>`rank() over (order by ${bestSellingProductsView.revenue} desc)::int`,
      })
      .from(bestSellingProductsView)
      .orderBy(desc(bestSellingProductsView.revenue))
      .limit(limit);
  }

  /** No dedicated view for this one — it's a one-off aggregation (categories aren't reported on anywhere else), so a CTE built from the query builder is clearer than a schema object only ever queried from here. */
  async getTopCategories(limit: number): Promise<TopCategoryResponseDto[]> {
    const categoryRevenue = this.db.$with('category_revenue').as(
      this.db
        .select({
          categoryId: categories.id,
          name: categories.name,
          unitsSold: sql<number>`coalesce(${sum(orderItems.quantity)}, 0)`
            .mapWith(Number)
            .as('units_sold'),
          revenue: sql<number>`coalesce(${sum(orderItems.lineTotal)}, 0)`
            .mapWith(Number)
            .as('revenue'),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .innerJoin(products, eq(products.id, orderItems.productId))
        .innerJoin(categories, eq(categories.id, products.categoryId))
        .where(inArray(orders.status, REVENUE_STATUSES))
        .groupBy(categories.id, categories.name),
    );

    return this.db
      .with(categoryRevenue)
      .select({
        rank: sql<number>`rank() over (order by ${categoryRevenue.revenue} desc)::int`,
        categoryId: categoryRevenue.categoryId,
        name: categoryRevenue.name,
        unitsSold: categoryRevenue.unitsSold,
        revenue: categoryRevenue.revenue,
      })
      .from(categoryRevenue)
      .orderBy(desc(categoryRevenue.revenue))
      .limit(limit);
  }

  async getMonthlySales(months: number): Promise<MonthlySalesResponseDto[]> {
    const rows = await this.db
      .select({
        month: monthlySalesView.month,
        orderCount: monthlySalesView.orderCount,
        revenue: monthlySalesView.revenue,
      })
      .from(monthlySalesView)
      .orderBy(desc(monthlySalesView.month))
      .limit(months);

    return rows.map((row) => ({
      month: row.month.toISOString(),
      orderCount: row.orderCount,
      revenue: row.revenue,
    }));
  }

  /** The view has no threshold baked in — this is the "WHERE stock <= x" a real table query would also need. */
  async getLowStock(threshold: number): Promise<LowStockProductResponseDto[]> {
    return this.db
      .select({
        id: lowStockProductsView.id,
        name: lowStockProductsView.name,
        sku: lowStockProductsView.sku,
        stock: lowStockProductsView.stock,
        categoryId: lowStockProductsView.categoryId,
      })
      .from(lowStockProductsView)
      .where(lte(lowStockProductsView.stock, threshold));
  }
}
