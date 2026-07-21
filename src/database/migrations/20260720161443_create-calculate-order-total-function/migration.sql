-- Custom SQL migration file, put your code below! --

-- A Postgres function, not application code: drizzle-kit's schema-as-code
-- generation covers tables/enums/views, but functions have to be authored
-- by hand via `drizzle-kit generate --custom` (an empty migration file for
-- exactly this purpose). Actually called from OrdersService.checkout,
-- not just left here as an unused artifact.
CREATE OR REPLACE FUNCTION calculate_order_total(p_subtotal numeric, p_discount numeric)
RETURNS numeric AS $$
  SELECT ROUND(GREATEST(p_subtotal - p_discount, 0), 2);
$$ LANGUAGE sql IMMUTABLE;
