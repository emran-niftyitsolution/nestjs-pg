CREATE VIEW "best_selling_products_view" AS (
  SELECT p.id AS product_id, p.name, p.slug,
         SUM(oi.quantity)::int AS units_sold,
         SUM(oi.line_total) AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ('paid', 'processing', 'shipped', 'delivered', 'refunded')
  GROUP BY p.id, p.name, p.slug
);--> statement-breakpoint
CREATE VIEW "low_stock_products_view" AS (
  SELECT id, name, sku, stock, category_id
  FROM products
  WHERE status = 'active'
  ORDER BY stock ASC
);--> statement-breakpoint
CREATE VIEW "monthly_sales_view" AS (
  SELECT date_trunc('month', created_at) AS month,
         COUNT(*)::int AS order_count,
         SUM(total) AS revenue
  FROM orders
  WHERE status IN ('paid', 'processing', 'shipped', 'delivered', 'refunded')
  GROUP BY date_trunc('month', created_at)
);