/*
# Payment info fields and saved payment records

1. New Tables
- `payment_info_fields`: the boxes shown in the checkout payment section. Each has a stable key, label, placeholder, required flag and sort order. Seeded with "Name on card" and "Expiry date".
- `payment_records`: one row per placed order holding the card brand and the values entered in the payment section (keyed by field).

2. Functions
- `place_demo_order`: now validates the payment section against the current fields (required fields must be filled) and saves a payment record with the order. Card number and security code are no longer collected.
- `admin_save_payment_field(...)`: adds or edits a checkout field. Admins only.
- `admin_delete_payment_field(...)`: removes a checkout field. Admins only.
- `admin_dashboard()`: also returns the field list and saved payment records. Admins only.

3. Security
- `payment_info_fields` is readable by the storefront (anon and signed-in) so checkout can show the fields; changes go through admin functions only.
- `payment_records` has no client access; it is written by `place_demo_order` and read through `admin_dashboard`.

4. Important Notes
- Card numbers and security codes are never stored.
*/

CREATE TABLE IF NOT EXISTS payment_info_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE CHECK (field_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  placeholder text NOT NULL DEFAULT '' CHECK (char_length(placeholder) <= 60),
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_info_fields ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON payment_info_fields TO anon, authenticated;

DROP POLICY IF EXISTS "select_payment_info_fields" ON payment_info_fields;
CREATE POLICY "select_payment_info_fields" ON payment_info_fields FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO payment_info_fields (field_key, label, placeholder, required, sort_order) VALUES
  ('cardholder_name', 'Name on card', '', true, 1),
  ('expiry', 'Expiry date', 'MM/YY', true, 2)
ON CONFLICT (field_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_records (
  order_number text PRIMARY KEY,
  card_brand text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.place_demo_order(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_quote jsonb;
v_line jsonb;
v_contact jsonb := coalesce(p->'contact', '{}'::jsonb);
v_address jsonb := coalesce(p->'shipping_address', '{}'::jsonb);
v_order_number text;
v_created timestamptz := now();
v_rows integer;
v_field payment_info_fields%ROWTYPE;
v_value text;
v_details jsonb := '{}'::jsonb;
BEGIN
IF coalesce(p->>'payment_brand', '') NOT IN ('visa', 'mastercard', 'amex') THEN
RAISE EXCEPTION 'Please select a card brand.';
END IF;
IF btrim(coalesce(v_contact->>'email', '')) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
RAISE EXCEPTION 'Please enter a valid email address.';
END IF;
IF btrim(coalesce(v_address->>'first_name', '')) = '' OR btrim(coalesce(v_address->>'last_name', '')) = '' THEN
RAISE EXCEPTION 'Please enter your first and last name.';
END IF;
IF btrim(coalesce(v_address->>'street', '')) = '' OR btrim(coalesce(v_address->>'city', '')) = '' THEN
RAISE EXCEPTION 'Please complete your street address and city.';
END IF;
IF coalesce(v_address->>'state', '') !~ '^[A-Z]{2}$' THEN
RAISE EXCEPTION 'Please choose a valid state.';
END IF;
IF coalesce(v_address->>'zip', '') !~ '^\d{5}(-\d{4})?$' THEN
RAISE EXCEPTION 'Please enter a valid ZIP code.';
END IF;

FOR v_field IN SELECT * FROM payment_info_fields ORDER BY sort_order, created_at LOOP
v_value := btrim(coalesce(p->'payment_details'->>v_field.field_key, ''));
IF v_field.required AND v_value = '' THEN
RAISE EXCEPTION 'Please enter %.', lower(v_field.label);
END IF;
IF char_length(v_value) > 200 THEN
RAISE EXCEPTION '% is too long.', v_field.label;
END IF;
v_details := v_details || jsonb_build_object(v_field.field_key, v_value);
END LOOP;

v_quote := quote_demo_order(p);

FOR v_line IN SELECT * FROM jsonb_array_elements(v_quote->'lines') LOOP
UPDATE products SET stock = stock - (v_line->>'quantity')::integer
WHERE slug = v_line->>'slug' AND stock >= (v_line->>'quantity')::integer;
GET DIAGNOSTICS v_rows = ROW_COUNT;
IF v_rows = 0 THEN
RAISE EXCEPTION 'Sorry, % just sold out. Please review your bag.', v_line->>'name';
END IF;
END LOOP;

v_order_number := 'VYR-' || to_char(v_created, 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

INSERT INTO orders (
order_number, contact, shipping_address, shipping_method, payment_brand, payment_status,
items, subtotal, discount, coupon_code, shipping_fee, total_due_now, cod_balance, created_at
) VALUES (
v_order_number,
jsonb_build_object('email', btrim(v_contact->>'email'), 'phone', btrim(coalesce(v_contact->>'phone', '')), 'order_updates', coalesce((v_contact->>'order_updates')::boolean, true)),
jsonb_build_object(
'first_name', btrim(v_address->>'first_name'),
'last_name', btrim(v_address->>'last_name'),
'street', btrim(v_address->>'street'),
'apartment', btrim(coalesce(v_address->>'apartment', '')),
'city', btrim(v_address->>'city'),
'state', v_address->>'state',
'zip', v_address->>'zip',
'country', 'US'
),
v_quote->>'shipping_method',
v_quote->>'payment_brand',
CASE WHEN v_quote->>'shipping_method' = 'advance' THEN 'simulated_paid' ELSE 'simulated_cod_fee_paid' END,
v_quote->'lines',
(v_quote->>'subtotal')::numeric,
(v_quote->>'discount')::numeric,
v_quote->>'coupon_code',
(v_quote->>'shipping_fee')::numeric,
(v_quote->>'total_due_now')::numeric,
(v_quote->>'cod_balance')::numeric,
v_created
);

INSERT INTO payment_records (order_number, card_brand, details, created_at)
VALUES (v_order_number, v_quote->>'payment_brand', v_details, v_created);

RETURN jsonb_build_object('order_number', v_order_number);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_save_payment_field(
  p_id uuid,
  p_field_key text,
  p_label text,
  p_placeholder text,
  p_required boolean,
  p_sort_order integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO payment_info_fields (field_key, label, placeholder, required, sort_order)
    VALUES (p_field_key, btrim(p_label), btrim(coalesce(p_placeholder, '')), coalesce(p_required, true), coalesce(p_sort_order, 0));
  ELSE
    UPDATE payment_info_fields
    SET label = btrim(p_label),
        placeholder = btrim(coalesce(p_placeholder, '')),
        required = coalesce(p_required, true),
        sort_order = coalesce(p_sort_order, 0)
    WHERE id = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Field not found.';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_field(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  DELETE FROM payment_info_fields WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field not found.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
        'placeholder', placeholder, 'required', required, 'sort_order', sort_order
      ) ORDER BY sort_order, created_at)
      FROM payment_info_fields
    ), '[]'::jsonb),
    'payments', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'order_number', order_number, 'card_brand', card_brand,
        'details', details, 'created_at', created_at
      ) ORDER BY created_at DESC)
      FROM payment_records
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_demo_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_demo_order(jsonb) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_payment_field(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_field(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
