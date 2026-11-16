/*
# Expose bank transfer order review data

1. Function Updates
- `get_demo_order` now returns the payment method and payment status for customer confirmation screens.
- `admin_dashboard` now returns bank-transfer payment state and proof details for admin review.

2. Security
- Customer order lookup still returns only the existing order number lookup response and does not expose the submitted proof image.
- Admin review data remains behind the existing authenticated admin dashboard check.
*/

CREATE OR REPLACE FUNCTION public.get_demo_order(p_order_number text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT to_jsonb(o) FROM (
SELECT order_number, status, contact, shipping_address, shipping_method, payment_method,
payment_brand, payment_status, items, subtotal, discount, coupon_code, shipping_fee,
total_due_now, cod_balance, created_at
FROM orders WHERE order_number = p_order_number
) o;
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
'visits_total', (SELECT count(*) FROM site_visitors),
'visits_today', (SELECT count(*) FROM site_visitors WHERE last_seen_at >= date_trunc('day', now())),
'visits_7d', (SELECT count(*) FROM site_visitors WHERE last_seen_at >= now() - interval '7 days'),
'products', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'slug', slug, 'name', name, 'sku', sku, 'category', category,
'price', price, 'stock', stock, 'status', status
) ORDER BY name)
FROM products), '[]'::jsonb),
'orders', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'order_number', order_number,
'status', status,
'payment_method', payment_method,
'payment_status', payment_status,
'bank_transfer_details', bank_transfer_details,
'email', contact->>'email',
'first_name', shipping_address->>'first_name',
'last_name', shipping_address->>'last_name',
'total', total_due_now + cod_balance,
'created_at', created_at
) ORDER BY created_at DESC)
FROM orders), '[]'::jsonb),
'payment_fields', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'id', id, 'field_key', field_key, 'label', label,
'placeholder', placeholder, 'required', required, 'sort_order', sort_order,
'input_rule', input_rule
) ORDER BY sort_order, created_at)
FROM payment_info_fields), '[]'::jsonb),
'payments', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'order_number', order_number, 'card_brand', card_brand,
'details', details, 'created_at', created_at
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
