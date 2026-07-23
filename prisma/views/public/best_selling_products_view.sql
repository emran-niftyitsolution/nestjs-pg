SELECT
  p.id AS product_id,
  p.name,
  p.slug,
  (sum(oi.quantity)) :: integer AS units_sold,
  sum(oi.line_total) AS revenue
FROM
  (
    (
      order_items oi
      JOIN orders o ON ((o.id = oi.order_id))
    )
    JOIN products p ON ((p.id = oi.product_id))
  )
WHERE
  (
    o.status = ANY (
      ARRAY ['paid'::order_status, 'processing'::order_status, 'shipped'::order_status, 'delivered'::order_status, 'refunded'::order_status]
    )
  )
GROUP BY
  p.id,
  p.name,
  p.slug;