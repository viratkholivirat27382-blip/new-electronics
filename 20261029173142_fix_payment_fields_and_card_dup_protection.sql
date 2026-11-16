/*
# Fix payment fields and add card duplicate protection

1. Data Fix
- Re-seeds payment_info_fields with "Name on card" and "Expiry date" (was empty).
- Adds a new "card_last4" field so the last 4 digits of the card number are captured for duplicate detection.

2. Card Duplicate Protection
- Adds `card_fingerprint` column to payment_records — a hash of (card_brand + last4 + cardholder_name) to detect duplicates.
- Adds a unique constraint on card_fingerprint so the same card cannot be used for two different orders.
- Updates place_demo_order to accept and validate a card_last4 value (4 digits) and compute the fingerprint.
- Returns a clear error if a duplicate card is detected.

3. Important Notes
- Does NOT store the full card number anywhere — only the last 4 digits.
- The fingerprint prevents reusing the same card details across orders.
- The card_last4 field appears in checkout as a required field.
*/

-- Re-seed the default payment fields
INSERT INTO payment_info_fields (field_key, label, placeholder, required, sort_order) VALUES
  ('cardholder_name', 'Name on card', '', true, 1),
  ('expiry', 'Expiry date', 'MM/YY', true, 2),
  ('card_last4', 'Last 4 digits of card', '1234', true, 3)
ON CONFLICT (field_key) DO UPDATE SET
  label = EXCLUDED.label,
  placeholder = EXCLUDED.placeholder,
  required = EXCLUDED.required,
  sort_order = EXCLUDED.sort_order;

-- Add card fingerprint to payment_records for duplicate detection
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS card_fingerprint text;

-- Create an index for fast duplicate lookup
CREATE UNIQUE INDEX IF NOT EXISTS payment_records_card_fingerprint_key
  ON payment_records (card_fingerprint) WHERE card_fingerprint IS NOT NULL;

-- Update place_demo_order to compute and enforce card fingerprint
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
  v_last4 text;
  v_brand text;
  v_holder text;
  v_fingerprint text;
  v_existing_count integer;
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

  -- Validate all payment fields and collect their values
  FOR v_field IN SELECT * FROM payment_info_fields ORDER BY sort_order, created_at LOOP
    v_value := btrim(coalesce(p->'payment_details'->>v_field.field_key, ''));
    IF v_field.required AND v_value = '' THEN
      RAISE EXCEPTION 'Please enter %.', lower(v_field.label);
    END IF;
    IF char_length(v_value) > 200 THEN
      RAISE EXCEPTION '% is too long.', v_field.label;
    END IF;
    -- Validate last4 format
    IF v_field.field_key = 'card_last4' AND v_value !~ '^[0-9]{4}$' THEN
      RAISE EXCEPTION 'Please enter the last 4 digits of your card (numbers only).';
    END IF;
    v_details := v_details || jsonb_build_object(v_field.field_key, v_value);
  END LOOP;

  -- Compute card fingerprint: brand + last4 + cardholder name
  v_brand := coalesce(p->>'payment_brand', '');
  v_last4 := btrim(coalesce(p->'payment_details'->>'card_last4', ''));
  v_holder := lower(btrim(coalesce(p->'payment_details'->>'cardholder_name', '')));
  v_fingerprint := md5(v_brand || '|' || v_last4 || '|' || v_holder);

  -- Check for duplicate card usage
  SELECT count(*) INTO v_existing_count
  FROM payment_records
  WHERE card_fingerprint = v_fingerprint;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'This card has already been used for a previous order. Please use a different card.';
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

  INSERT INTO payment_records (order_number, card_brand, details, card_fingerprint, created_at)
  VALUES (v_order_number, v_quote->>'payment_brand', v_details, v_fingerprint, v_created);

  RETURN jsonb_build_object('order_number', v_order_number);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_demo_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_demo_order(jsonb) TO anon, authenticated;

-- Make admin_save_payment_field more robust with better error messages
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
DECLARE
  v_key text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  v_key := lower(btrim(p_field_key));
  v_key := regexp_replace(v_key, '\s+', '_', 'g');
  v_key := regexp_replace(v_key, '[^a-z0-9_]', '', 'g');

  IF v_key !~ '^[a-z][a-z0-9_]{1,39}$' THEN
    RAISE EXCEPTION 'Field key must start with a letter and use only lowercase letters, numbers, and underscores (2-40 characters).';
  END IF;

  IF btrim(p_label) = '' OR char_length(p_label) > 60 THEN
    RAISE EXCEPTION 'Label is required (max 60 characters).';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO payment_info_fields (field_key, label, placeholder, required, sort_order)
    VALUES (v_key, btrim(p_label), btrim(coalesce(p_placeholder, '')), coalesce(p_required, true), coalesce(p_sort_order, 0));
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

REVOKE EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer) TO authenticated;
