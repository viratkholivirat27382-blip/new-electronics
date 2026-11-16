/*
# Correct visitor count filtering

1. Modified Functions
- `admin_dashboard` now filters stored visitor rows by their `is_admin` column instead of checking the current admin caller for every row.

2. Important Notes
- The current admin can view visitor analytics.
- Rows marked as admin are excluded from total, today, seven-day, and country totals.
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
