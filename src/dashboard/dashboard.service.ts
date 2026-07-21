// src/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '@/database/database.service';
import type { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import type { LowStockProductResponseDto } from './dto/low-stock-product-response.dto';
import type { MonthlySalesResponseDto } from './dto/monthly-sales-response.dto';
import type { TopCategoryResponseDto } from './dto/top-category-response.dto';
import type { TopProductResponseDto } from './dto/top-product-response.dto';

// The same "which orders actually represent revenue" filter as the views
// (dashboard-views.schema.ts) — repeated here rather than imported because
// this is a raw SQL fragment, not a column/table reference.
const REVENUE_STATUSES = sql`('paid', 'processing', 'shipped', 'delivered', 'refunded')`;

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * One query, four aggregates, via CTEs — each subquery in its own named
   * block instead of four separate round trips (or one query with a
   * fragile cross-join of unrelated aggregates).
   */
  async getSummary(): Promise<DashboardSummaryResponseDto> {
    const rows = (await this.db.execute(sql`
      WITH order_stats AS (
        SELECT COUNT(*)::int AS total_orders, COALESCE(SUM(total), 0) AS total_revenue
        FROM orders
        WHERE status IN ${REVENUE_STATUSES}
      ),
      product_stats AS (
        SELECT COUNT(*)::int AS total_products FROM products
      ),
      customer_stats AS (
        SELECT COUNT(*)::int AS total_customers FROM users WHERE role = 'customer'
      )
      SELECT total_revenue, total_orders, total_products, total_customers
      FROM order_stats, product_stats, customer_stats
    `)) as unknown as Array<{
      total_revenue: number;
      total_orders: number;
      total_products: number;
      total_customers: number;
    }>;

    const row = rows[0];
    return {
      totalRevenue: Number(row.total_revenue),
      totalOrders: row.total_orders,
      totalProducts: row.total_products,
      totalCustomers: row.total_customers,
    };
  }

  /** Reads from best_selling_products_view; RANK() is applied here rather than baked into the view, since ranking is a presentation concern the view's consumers should get to choose (top 10 vs top 100, etc). */
  async getTopProducts(limit: number): Promise<TopProductResponseDto[]> {
    const rows = (await this.db.execute(sql`
      SELECT product_id, name, slug, units_sold, revenue,
             RANK() OVER (ORDER BY revenue DESC)::int AS rank
      FROM best_selling_products_view
      ORDER BY revenue DESC
      LIMIT ${limit}
    `)) as unknown as Array<{
      product_id: string;
      name: string;
      slug: string;
      units_sold: number;
      revenue: number;
      rank: number;
    }>;

    return rows.map((row) => ({
      rank: row.rank,
      productId: row.product_id,
      name: row.name,
      slug: row.slug,
      unitsSold: row.units_sold,
      revenue: Number(row.revenue),
    }));
  }

  /** No dedicated view for this one — it's a one-off aggregation (categories aren't reported on anywhere else), so a CTE inline is clearer than a schema object only ever queried from here. */
  async getTopCategories(limit: number): Promise<TopCategoryResponseDto[]> {
    const rows = (await this.db.execute(sql`
      WITH category_revenue AS (
        SELECT c.id AS category_id, c.name,
               SUM(oi.quantity)::int AS units_sold,
               SUM(oi.line_total) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE o.status IN ${REVENUE_STATUSES}
        GROUP BY c.id, c.name
      )
      SELECT category_id, name, units_sold, revenue,
             RANK() OVER (ORDER BY revenue DESC)::int AS rank
      FROM category_revenue
      ORDER BY revenue DESC
      LIMIT ${limit}
    `)) as unknown as Array<{
      category_id: string;
      name: string;
      units_sold: number;
      revenue: number;
      rank: number;
    }>;

    return rows.map((row) => ({
      rank: row.rank,
      categoryId: row.category_id,
      name: row.name,
      unitsSold: row.units_sold,
      revenue: Number(row.revenue),
    }));
  }

  async getMonthlySales(months: number): Promise<MonthlySalesResponseDto[]> {
    const rows = (await this.db.execute(sql`
      SELECT month, order_count, revenue
      FROM monthly_sales_view
      ORDER BY month DESC
      LIMIT ${months}
    `)) as unknown as Array<{
      month: Date;
      order_count: number;
      revenue: number;
    }>;

    return rows.map((row) => ({
      month: row.month.toISOString(),
      orderCount: row.order_count,
      revenue: Number(row.revenue),
    }));
  }

  /** The view has no threshold baked in — this is the "WHERE stock <= x" a real table query would also need. */
  async getLowStock(threshold: number): Promise<LowStockProductResponseDto[]> {
    const rows = (await this.db.execute(sql`
      SELECT id, name, sku, stock, category_id
      FROM low_stock_products_view
      WHERE stock <= ${threshold}
    `)) as unknown as Array<{
      id: string;
      name: string;
      sku: string;
      stock: number;
      category_id: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      stock: row.stock,
      categoryId: row.category_id,
    }));
  }
}
