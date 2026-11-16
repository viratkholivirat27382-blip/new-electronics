/*
# Add admin_create_product

1. New Function
- `admin_create_product` adds a new product from the admin inventory. It returns the generated product link key (slug) so the admin screen can show the new product.
- The slug is built from the product name with a short random suffix, so two products with the same name never collide.

2. Security
- SECURITY DEFINER with an is_admin() check and a fixed search_path, same as admin_update_product.
- Callable only by signed-in users (anon and PUBLIC are revoked).
- Same validation rules as admin_update_product: required name and category, price bounds, audience and status values, at most 8 images, stock must not be negative.

3. Important Notes
- No existing rows or functions are changed.
- Existing products are untouched.
*/

CREATE OR REPLACE FUNCTION public.admin_create_product(
  p_name text,
  p_category text,
  p_price numeric,
  p_compare_at_price numeric DEFAULT NULL,
  p_subcategory text DEFAULT '',
  p_audience text DEFAULT 'all',
  p_short_description text DEFAULT '',
  p_description text DEFAULT '',
  p_sku text DEFAULT '',
  p_sizes text[] DEFAULT '{}',
  p_colors text[] DEFAULT '{}',
  p_images text[] DEFAULT '{}',
  p_is_new boolean DEFAULT false,
  p_is_featured boolean DEFAULT false,
  p_is_best_seller boolean DEFAULT false,
  p_status text DEFAULT 'active',
  p_stock integer DEFAULT 0
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF btrim(coalesce(p_name, '')) = '' OR btrim(coalesce(p_category, '')) = '' THEN
    RAISE EXCEPTION 'Title and category are required.';
  END IF;
  IF p_price IS NULL OR p_price < 0 OR p_price > 1000000 THEN
    RAISE EXCEPTION 'Price must be between 0 and 1000000.';
  END IF;
  IF p_compare_at_price IS NOT NULL AND (p_compare_at_price < 0 OR p_compare_at_price > 1000000) THEN
    RAISE EXCEPTION 'Compare price must be between 0 and 1000000.';
  END IF;
  IF p_audience NOT IN ('all', 'men', 'women', 'girls', 'boys') THEN
    RAISE EXCEPTION 'Invalid audience.';
  END IF;
  IF p_status NOT IN ('active', 'draft', 'archived') THEN
    RAISE EXCEPTION 'Invalid status.';
  END IF;
  IF p_stock IS NULL OR p_stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative.';
  END IF;
  IF array_length(p_images, 1) IS NOT NULL AND array_length(p_images, 1) > 8 THEN
    RAISE EXCEPTION 'A product can have at most 8 images.';
  END IF;

  v_slug := coalesce(nullif(trim(both '-' from lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'product')
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO products (
    slug, name, category, price, compare_at_price, subcategory, audience,
    short_description, description, sku, sizes, colors, images, stock,
    is_new, is_featured, is_best_seller, status
  ) VALUES (
    v_slug,
    btrim(p_name),
    btrim(p_category),
    round(p_price, 2),
    CASE WHEN p_compare_at_price IS NULL OR p_compare_at_price = 0 THEN NULL ELSE round(p_compare_at_price, 2) END,
    btrim(coalesce(p_subcategory, '')),
    p_audience,
    coalesce(p_short_description, ''),
    coalesce(p_description, ''),
    btrim(coalesce(p_sku, '')),
    coalesce(p_sizes, '{}'),
    coalesce(p_colors, '{}'),
    coalesce(p_images, '{}'),
    p_stock,
    p_is_new,
    p_is_featured,
    p_is_best_seller,
    p_status
  );

  RETURN v_slug;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_create_product(text, text, numeric, numeric, text, text, text, text, text, text[], text[], text[], boolean, boolean, boolean, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_product(text, text, numeric, numeric, text, text, text, text, text, text[], text[], text[], boolean, boolean, boolean, text, integer) TO authenticated;
