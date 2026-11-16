/*
# Add per-category display position to products

1. Modified Tables
- `products`: new column `sort_order` (integer, default 0). Lower numbers appear first within their category on the website.

2. Backfill
- When the column is first added, existing products are numbered 1, 2, 3... within each category, newest first, so the storefront order does not change.

3. New Functions
- `admin_set_product_position(p_slug, p_sort_order)`: admin-only. Sets a product's position number. Mirrors the existing admin stock function.

4. Security
- The new function is executable only by the roles that can already run admin functions (authenticated, service_role). PUBLIC and anon are revoked.

5. Notes
- Safe to re-run: the column and backfill are guarded, and the function is created with CREATE OR REPLACE.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE products ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

    UPDATE products AS p
    SET sort_order = ranked.position
    FROM (
      SELECT slug, row_number() OVER (PARTITION BY category ORDER BY created_at DESC, slug) AS position
      FROM products
    ) AS ranked
    WHERE p.slug = ranked.slug;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_category_sort_order_idx ON products (category, sort_order);

CREATE OR REPLACE FUNCTION public.admin_set_product_position(p_slug text, p_sort_order integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF p_sort_order IS NULL OR p_sort_order < 1 THEN
    RAISE EXCEPTION 'Position must be 1 or more.';
  END IF;
  UPDATE products SET sort_order = p_sort_order WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found.';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_set_product_position(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_product_position(text, integer) TO authenticated, service_role;
