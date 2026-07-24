// src/modules/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { Role } from '@/common/enums/role.enum';
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import type { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import type { LowStockProductResponseDto } from './dto/low-stock-product-response.dto';
import type { MonthlySalesResponseDto } from './dto/monthly-sales-response.dto';
import type { TopCategoryResponseDto } from './dto/top-category-response.dto';
import type { TopProductResponseDto } from './dto/top-product-response.dto';

// The same "which orders actually represent revenue" filter as the views
// (see the baseline migration) — repeated here because it also drives the
// category-revenue CTE, which has no dedicated view.
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.Paid,
  OrderStatus.Processing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Refunded,
];

interface TopCategoryRow {
  rank: number;
  categoryId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Three independent aggregates — run as separate queries in parallel rather than joined/CTE'd together, since they don't share a FROM clause. */
  async getSummary(): Promise<DashboardSummaryResponseDto> {
    const [orderStats, totalProducts, totalCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { in: REVENUE_STATUSES } },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.product.count(),
      this.prisma.user.count({ where: { role: Role.Customer } }),
    ]);

    return {
      totalRevenue: orderStats._sum.total?.toNumber() ?? 0,
      totalOrders: orderStats._count,
      totalProducts,
      totalCustomers,
    };
  }

  /** Reads from best_selling_products_view; RANK() is applied here rather than baked into the view, since ranking is a presentation concern the view's consumers should get to choose (top 10 vs top 100, etc). */
  async getTopProducts(limit: number): Promise<TopProductResponseDto[]> {
    const rows = await this.prisma.bestSellingProductsView.findMany({
      orderBy: { revenue: 'desc' },
      take: limit,
    });

    return rows.map((row, index) => ({
      rank: index + 1,
      productId: row.productId as string,
      name: row.name as string,
      slug: row.slug as string,
      unitsSold: row.unitsSold as number,
      revenue: row.revenue?.toNumber() ?? 0,
    }));
  }

  /**
   * No dedicated view for this one — it's a one-off aggregation
   * (categories aren't reported on anywhere else). Prisma Client has no
   * query-builder CTE support, so this runs as one raw query; the `::int`/
   * `::float8` casts mean the row comes back as plain numbers already, no
   * `.toNumber()` step needed (unlike the Decimal view reads above).
   */
  async getTopCategories(limit: number): Promise<TopCategoryResponseDto[]> {
    return this.prisma.$queryRaw<TopCategoryRow[]>(Prisma.sql`
      WITH category_revenue AS (
        SELECT
          c.id AS category_id,
          c.name AS name,
          COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
          COALESCE(SUM(oi.line_total), 0)::float8 AS revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        INNER JOIN categories c ON c.id = p.category_id
        WHERE o.status::text = ANY(${REVENUE_STATUSES}::text[])
        GROUP BY c.id, c.name
      )
      SELECT
        rank() OVER (ORDER BY revenue DESC)::int AS rank,
        category_id AS "categoryId",
        name,
        units_sold AS "unitsSold",
        revenue
      FROM category_revenue
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);
  }

  async getMonthlySales(months: number): Promise<MonthlySalesResponseDto[]> {
    const rows = await this.prisma.monthlySalesView.findMany({
      orderBy: { month: 'desc' },
      take: months,
    });

    return rows.map((row) => ({
      month: (row.month as Date).toISOString(),
      orderCount: row.orderCount as number,
      revenue: row.revenue?.toNumber() ?? 0,
    }));
  }

  /** The view has no threshold baked in — this is the "WHERE stock <= x" a real table query would also need. */
  async getLowStock(threshold: number): Promise<LowStockProductResponseDto[]> {
    const rows = await this.prisma.lowStockProductsView.findMany({
      where: { stock: { lte: threshold } },
    });

    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      sku: row.sku as string,
      stock: row.stock as number,
      categoryId: row.categoryId,
    }));
  }
}
