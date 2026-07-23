SELECT
  id,
  name,
  sku,
  stock,
  category_id
FROM
  products
WHERE
  (STATUS = 'active' :: product_status)
ORDER BY
  stock;