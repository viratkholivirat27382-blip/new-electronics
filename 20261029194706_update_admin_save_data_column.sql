/*
# Add save_data to admin_save_payment_field and admin_dashboard, update place_demo_order to respect save_data
*/

-- Update admin_save_payment_field to accept p_save_data
CREATE OR REPLACE FUNCTION public.admin_save_payment_field(
  p_id uuid,
  p_field_key text,
  p_label text,
  p_placeholder text,
  p_required boolean,
  p_sort_order integer,
  p_input_rule text DEFAULT 'text',
  p_save_data boolean DEFAULT true
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
  IF p_id IS NULL THEN
    INSERT INTO payment_info_fields (field_key, label, placeholder, required, sort_order, input_rule, save_data)
    VALUES (p_field_key, p_label, p_placeholder, p_required, p_sort_order, p_input_rule, p_save_data);
  ELSE
    UPDATE payment_info_fields
    SET field_key = p_field_key, label = p_label, placeholder = p_placeholder,
        required = p_required, sort_order = p_sort_order, input_rule = p_input_rule,
        save_data = p_save_data
    WHERE id = p_id;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer, text, boolean) TO authenticated;

-- Update admin_dashboard to return save_data in payment_fields
CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
FROM products
), '[]'::jsonb),
'orders', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'order_number', order_number,
'status', status,
'email', contact->>'email',
'first_name', shipping_address->>'first_name',
'last_name', shipping_address->>'last_name',
'total', total_due_now + cod_balance,
'created_at', created_at
) ORDER BY created_at DESC)
FROM orders
), '[]'::jsonb),
'payment_fields', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'id', id, 'field_key', field_key, 'label', label,
'placeholder', placeholder, 'required', required, 'sort_order', sort_order,
'input_rule', input_rule, 'save_data', save_data
) ORDER BY sort_order, created_at)
FROM payment_info_fields
), '[]'::jsonb),
'payments', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'order_number', order_number, 'card_brand', card_brand,
'details', details, 'created_at', created_at
) ORDER BY created_at DESC)
FROM payment_records
), '[]'::jsonb),
'brand_rules', coalesce((
SELECT jsonb_agg(jsonb_build_object(
'id', id, 'brand', brand, 'starting_digits', starting_digits
) ORDER BY brand)
FROM card_brand_rules
), '[]'::jsonb)
);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
