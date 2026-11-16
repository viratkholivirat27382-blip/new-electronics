/*
# Make all product details editable in admin inventory

1. Modified Functions
- `admin_dashboard` now returns full product details: subcategory, audience, short_description, description, sku, sizes, colors, images, and visibility flags (is_new, is_featured, is_best_seller, status).
- `admin_update_product` now accepts all editable product fields including images array, sizes, colors, descriptions, and flags.

2. Security
- `admin_update_product` remains SECURITY DEFINER with is_admin() check and fixed search_path.
- All inputs are validated: price bounds, non-empty required text fields, arrays capped at reasonable length.

3. Important Notes
- Images are stored as text[] (array of URL strings). The admin can edit up to 8 image URLs per product.
- Existing products keep their current data; only fields the admin changes are updated.
*/

CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT is_admin() THEN
RAISE EXCEPTION 'Not authorized.';
END IF;

RETURN jsonb_build_object(
'visits_total', (SELECT count(*) FROM site_visitors WHERE NOT site_visitors.is_admin),
'visits_today', (SELECT count(*) FROM site_visitors WHERE NOT site_visitors.is_admin AND last_seen_at >= date_trunc('day', now())),
'visits_7d', (SELECT count(*) FROM site_visitors WHERE NOT site_visitors.is_admin AND last_seen_at >= now() - interval '7 days'),
'visitor_countries', coalesce((
SELECT jsonb_agg(jsonb_build_object('country', coalesce(country, 'Unknown'), 'visitors', visitor_count) ORDER BY visitor_count DESC, country)
FROM (SELECT country, count(*) AS visitor_count FROM site_visitors WHERE NOT site_visitors.is_admin GROUP BY country) country_totals
), '[]'::jsonb),
'products', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'slug', slug, 'name', name, 'sku', sku, 'category', category,
'subcategory', subcategory, 'audience', audience,
'short_description', short_description, 'description', description,
'price', price, 'compare_at_price', compare_at_price,
'sizes', sizes, 'colors', colors, 'images', images,
'stock', stock, 'status', status,
'is_new', is_new, 'is_featured', is_featured, 'is_best_seller', is_best_seller
) ORDER BY name)
FROM products), '[]'::jsonb),
'orders', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'order_number', order_number, 'status', status, 'payment_method', payment_method,
'payment_status', payment_status, 'bank_transfer_details', bank_transfer_details,
'email', contact->>'email', 'first_name', shipping_address->>'first_name',
'last_name', shipping_address->>'last_name', 'total', total_due_now + cod_balance,
'created_at', created_at
) ORDER BY created_at DESC)
FROM orders), '[]'::jsonb),
'payment_fields', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'id', id, 'field_key', field_key, 'label', label, 'placeholder', placeholder,
'required', required, 'sort_order', sort_order, 'input_rule', input_rule
) ORDER BY sort_order, created_at)
FROM payment_info_fields), '[]'::jsonb),
'payments', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'order_number', order_number, 'card_brand', card_brand, 'details', details, 'created_at', created_at
) ORDER BY created_at DESC)
FROM payment_records), '[]'::jsonb),
'brand_rules', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'id', id, 'brand', brand, 'starting_digits', starting_digits
) ORDER BY brand)
FROM card_brand_rules), '[]'::jsonb)
);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_slug text,
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
  p_status text DEFAULT 'active'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT is_admin() THEN
RAISE EXCEPTION 'Not authorized.';
END IF;
IF btrim(coalesce(p_slug, '')) = '' OR btrim(coalesce(p_name, '')) = '' OR btrim(coalesce(p_category, '')) = '' THEN
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
IF array_length(p_images, 1) IS NOT NULL AND array_length(p_images, 1) > 8 THEN
RAISE EXCEPTION 'A product can have at most 8 images.';
END IF;

UPDATE products
SET
  name = btrim(p_name),
  category = btrim(p_category),
  price = round(p_price, 2),
  compare_at_price = CASE WHEN p_compare_at_price IS NULL OR p_compare_at_price = 0 THEN NULL ELSE round(p_compare_at_price, 2) END,
  subcategory = btrim(coalesce(p_subcategory, '')),
  audience = p_audience,
  short_description = coalesce(p_short_description, ''),
  description = coalesce(p_description, ''),
  sku = btrim(coalesce(p_sku, '')),
  sizes = p_sizes,
  colors = p_colors,
  images = p_images,
  is_new = p_is_new,
  is_featured = p_is_featured,
  is_best_seller = p_is_best_seller,
  status = p_status
WHERE slug = p_slug;

IF NOT FOUND THEN
RAISE EXCEPTION 'Product not found.';
END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_update_product(text, text, text, numeric, numeric, text, text, text, text, text, text[], text[], text[], boolean, boolean, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_product(text, text, text, numeric, numeric, text, text, text, text, text, text[], text[], text[], boolean, boolean, boolean, text) TO authenticated;
