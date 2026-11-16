/*
# Expand admin controls and visitor analytics

1. Modified Tables
- `site_visitors.country` stores the country detected for a unique visitor.
- `site_visitors.is_admin` marks legacy/admin visitor rows safely; new admin page visits are skipped by the tracking function.

2. New Admin Functions
- `admin_update_product` edits the product title, category, price, and compare-at price.
- `admin_delete_payment_record` removes one saved payment record.
- `admin_delete_brand_rule` removes one card-brand rule.
- `admin_delete_customer` removes a customer's stored order and payment records by email.

3. Visitor Tracking
- `record_visit` accepts an optional country and never records a visit when the caller is an admin.
- `admin_dashboard` returns unique visitor country totals in addition to total, today, and seven-day counts.

4. Security
- Every new mutation is SECURITY DEFINER, uses a fixed public search path, checks `is_admin()`, and is executable only by authenticated users.
- No anonymous browser role can edit, delete, or approve admin data through these functions.
- Customer deletion removes only order/payment records matching the exact normalized email supplied by the authenticated admin.

5. Important Notes
- Product title refers to the product name shown in the catalog. Existing review records are not linked to products in the current schema, so they are not changed by inventory edits.
- Existing visitor rows remain available; future admin visits are excluded at the database boundary.
*/

ALTER TABLE public.site_visitors
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.record_visit(p_visitor_id uuid, p_country text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF p_visitor_id IS NULL OR is_admin() THEN
RETURN;
END IF;

INSERT INTO site_visitors (visitor_id, country, is_admin)
VALUES (p_visitor_id, nullif(left(btrim(coalesce(p_country, '')), 80), ''), false)
ON CONFLICT (visitor_id) DO UPDATE SET
  last_seen_at = now(),
  country = coalesce(site_visitors.country, EXCLUDED.country);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_slug text,
  p_name text,
  p_category text,
  p_price numeric,
  p_compare_at_price numeric DEFAULT NULL
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
UPDATE products
SET name = btrim(p_name), category = btrim(p_category), price = round(p_price, 2), compare_at_price = CASE WHEN p_compare_at_price IS NULL OR p_compare_at_price = 0 THEN NULL ELSE round(p_compare_at_price, 2) END
WHERE slug = p_slug;
IF NOT FOUND THEN
RAISE EXCEPTION 'Product not found.';
END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_record(p_order_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT is_admin() THEN
RAISE EXCEPTION 'Not authorized.';
END IF;
DELETE FROM payment_records WHERE order_number = p_order_number;
IF NOT FOUND THEN
RAISE EXCEPTION 'Payment record not found.';
END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_brand_rule(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT is_admin() THEN
RAISE EXCEPTION 'Not authorized.';
END IF;
DELETE FROM card_brand_rules WHERE id = p_id;
IF NOT FOUND THEN
RAISE EXCEPTION 'Brand rule not found.';
END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_customer(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
IF NOT is_admin() THEN
RAISE EXCEPTION 'Not authorized.';
END IF;
IF v_email = '' THEN
RAISE EXCEPTION 'Customer email is required.';
END IF;

DELETE FROM payment_records
WHERE order_number IN (
  SELECT order_number FROM orders WHERE lower(contact->>'email') = v_email
);
DELETE FROM orders WHERE lower(contact->>'email') = v_email;
END;
$function$;

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
'visits_total', (SELECT count(*) FROM site_visitors WHERE NOT is_admin),
'visits_today', (SELECT count(*) FROM site_visitors WHERE NOT is_admin AND last_seen_at >= date_trunc('day', now())),
'visits_7d', (SELECT count(*) FROM site_visitors WHERE NOT is_admin AND last_seen_at >= now() - interval '7 days'),
'visitor_countries', coalesce((
SELECT jsonb_agg(jsonb_build_object('country', coalesce(country, 'Unknown'), 'visitors', visitor_count) ORDER BY visitor_count DESC, country)
FROM (SELECT country, count(*) AS visitor_count FROM site_visitors WHERE NOT is_admin GROUP BY country) country_totals
), '[]'::jsonb),
'products', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'slug', slug, 'name', name, 'sku', sku, 'category', category,
'price', price, 'compare_at_price', compare_at_price, 'stock', stock, 'status', status
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

REVOKE EXECUTE ON FUNCTION public.admin_update_product(text, text, text, numeric, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_payment_record(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_brand_rule(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_customer(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_product(text, text, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_record(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_brand_rule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_visit(uuid, text) TO anon, authenticated;
