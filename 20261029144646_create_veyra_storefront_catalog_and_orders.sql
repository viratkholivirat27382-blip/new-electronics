/*
# VEYRA storefront: catalog, shipping settings, coupons, demo orders

1. New Tables
- `products`: catalog items with price, sizes, colors, images, stock and status.
- `shipping_settings`: single-row table holding the advance-payment shipping fee and the COD prepaid shipping fee (default $3).
- `coupons`: demo discount codes (percentage or fixed amount, minimum subtotal, expiry).
- `orders`: demo orders with contact, shipping address, item snapshot and simulated payment status.

2. Functions
- `quote_demo_order(p jsonb)`: recalculates item prices, stock, coupon discount and shipping from the database. Used for the checkout summary.
- `place_demo_order(p jsonb)`: re-runs the quote, validates contact and address details, decrements stock and creates a demo order with a unique order number.
- `get_demo_order(p_order_number text)`: returns one demo order for the confirmation page.

3. Security
- RLS is enabled on every table.
- Anonymous and signed-in visitors can read only active products and the shipping settings.
- Coupons and orders have no direct client access; they are reached only through the functions above.
- Functions run with the owner's rights and have their EXECUTE permission restricted to the API roles that need it.

4. Important Notes
- All prices, shipping fees, discounts and totals are calculated on the server. The browser never decides them.
- Payments are simulated. No card numbers are collected or stored, and no real money moves.
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  subcategory text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(10,2) CHECK (compare_at_price IS NULL OR compare_at_price > price),
  sku text UNIQUE NOT NULL,
  sizes text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_new boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON products TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_active_products" ON products;
CREATE POLICY "anon_select_active_products" ON products FOR SELECT
  TO anon, authenticated USING (status = 'active');

CREATE TABLE IF NOT EXISTS shipping_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  advance_shipping_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (advance_shipping_fee >= 0),
  cod_prepaid_shipping_fee numeric(10,2) NOT NULL DEFAULT 3 CHECK (cod_prepaid_shipping_fee >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO shipping_settings (id, advance_shipping_fee, cod_prepaid_shipping_fee)
VALUES (1, 0, 3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE shipping_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON shipping_settings TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_shipping_settings" ON shipping_settings;
CREATE POLICY "anon_select_shipping_settings" ON shipping_settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY,
  percent_off numeric(5,2) CHECK (percent_off IS NULL OR (percent_off > 0 AND percent_off <= 100)),
  fixed_off numeric(10,2) CHECK (fixed_off IS NULL OR fixed_off > 0),
  min_subtotal numeric(10,2) NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  CHECK ((percent_off IS NULL) <> (fixed_off IS NULL))
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

INSERT INTO coupons (code, percent_off, fixed_off, min_subtotal, active)
VALUES ('WELCOME10', 10, NULL, 0, true),
       ('VEYRA20', 20, NULL, 150, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  contact jsonb NOT NULL,
  shipping_address jsonb NOT NULL,
  shipping_method text NOT NULL CHECK (shipping_method IN ('advance', 'cod')),
  payment_brand text NOT NULL CHECK (payment_brand IN ('visa', 'mastercard', 'amex')),
  payment_status text NOT NULL CHECK (payment_status IN ('simulated_paid', 'simulated_cod_fee_paid')),
  items jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  coupon_code text,
  shipping_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_due_now numeric(10,2) NOT NULL,
  cod_balance numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.quote_demo_order(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product products%ROWTYPE;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_qty integer;
  v_size text;
  v_color text;
  v_code text := upper(btrim(coalesce(p->>'coupon_code', '')));
  v_coupon coupons%ROWTYPE;
  v_discount numeric(10,2) := 0;
  v_settings shipping_settings%ROWTYPE;
  v_method text := p->>'shipping_method';
  v_shipping numeric(10,2);
  v_due numeric(10,2);
  v_balance numeric(10,2);
  v_brand text := p->>'payment_brand';
BEGIN
  IF jsonb_typeof(p->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'items') = 0 THEN
    RAISE EXCEPTION 'Your bag is empty.';
  END IF;

  IF v_method NOT IN ('advance', 'cod') THEN
    RAISE EXCEPTION 'Please choose a shipping and payment option.';
  END IF;

  IF v_brand NOT IN ('visa', 'mastercard', 'amex') THEN
    RAISE EXCEPTION 'Please select a card brand.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p->'items') LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 10 THEN
      RAISE EXCEPTION 'Quantities must be between 1 and 10.';
    END IF;

    SELECT * INTO v_product FROM products
      WHERE slug = v_item->>'slug' AND status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the items in your bag is no longer available.';
    END IF;

    v_size := coalesce(v_item->>'size', '');
    v_color := coalesce(v_item->>'color', '');

    IF cardinality(v_product.sizes) > 0 AND NOT (v_size = ANY (v_product.sizes)) THEN
      RAISE EXCEPTION 'Please select a valid size for %.', v_product.name;
    END IF;
    IF cardinality(v_product.colors) > 0 AND NOT (v_color = ANY (v_product.colors)) THEN
      RAISE EXCEPTION 'Please select a valid color for %.', v_product.name;
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Only % left in stock for %.', v_product.stock, v_product.name;
    END IF;

    v_subtotal := v_subtotal + v_product.price * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'slug', v_product.slug,
      'name', v_product.name,
      'sku', v_product.sku,
      'image', coalesce(v_product.images[1], ''),
      'size', v_size,
      'color', v_color,
      'quantity', v_qty,
      'unit_price', v_product.price,
      'line_total', v_product.price * v_qty
    ));
  END LOOP;

  IF v_code <> '' THEN
    SELECT * INTO v_coupon FROM coupons WHERE code = v_code AND active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That discount code is not valid.';
    END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'That discount code has expired.';
    END IF;
    IF v_subtotal < v_coupon.min_subtotal THEN
      RAISE EXCEPTION 'Spend $% to use code %.', v_coupon.min_subtotal, v_code;
    END IF;
    IF v_coupon.percent_off IS NOT NULL THEN
      v_discount := round(v_subtotal * v_coupon.percent_off / 100, 2);
    ELSE
      v_discount := least(v_coupon.fixed_off, v_subtotal);
    END IF;
  ELSE
    v_code := NULL;
  END IF;

  SELECT * INTO v_settings FROM shipping_settings WHERE id = 1;

  IF v_method = 'advance' THEN
    v_shipping := v_settings.advance_shipping_fee;
    v_due := v_subtotal - v_discount + v_shipping;
    v_balance := 0;
  ELSE
    v_shipping := v_settings.cod_prepaid_shipping_fee;
    v_due := v_shipping;
    v_balance := v_subtotal - v_discount;
  END IF;

  RETURN jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'coupon_code', v_code,
    'shipping_method', v_method,
    'shipping_fee', v_shipping,
    'total_due_now', v_due,
    'cod_balance', v_balance,
    'payment_brand', v_brand
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.place_demo_order(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote jsonb;
  v_line jsonb;
  v_contact jsonb := coalesce(p->'contact', '{}'::jsonb);
  v_address jsonb := coalesce(p->'shipping_address', '{}'::jsonb);
  v_order_number text;
  v_created timestamptz := now();
  v_rows integer;
BEGIN
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

  RETURN jsonb_build_object('order_number', v_order_number);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_demo_order(p_order_number text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(o) FROM (
    SELECT order_number, status, contact, shipping_address, shipping_method, payment_brand,
           payment_status, items, subtotal, discount, coupon_code, shipping_fee,
           total_due_now, cod_balance, created_at
    FROM orders WHERE order_number = p_order_number
  ) o;
$$;

REVOKE EXECUTE ON FUNCTION public.quote_demo_order(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.place_demo_order(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_demo_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_demo_order(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_demo_order(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_demo_order(text) TO anon, authenticated;
