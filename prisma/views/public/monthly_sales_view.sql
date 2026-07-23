SELECT
  date_trunc('month' :: text, created_at) AS MONTH,
  (count(*)) :: integer AS order_count,
  sum(total) AS revenue
FROM
  orders
WHERE
  (
    STATUS = ANY (
      ARRAY ['paid'::order_status, 'processing'::order_status, 'shipped'::order_status, 'delivered'::order_status, 'refunded'::order_status]
    )
  )
GROUP BY
  (date_trunc('month' :: text, created_at));