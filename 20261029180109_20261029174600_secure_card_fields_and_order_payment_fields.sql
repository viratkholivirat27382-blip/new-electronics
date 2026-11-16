/*
# Secure card fields and arrange checkout payment fields

1. Data changes
- Adds configurable checkout fields for card number, cardholder name, expiry date, CVV, and postal code.
- Keeps existing field definitions and updates the legacy card-last-four field to optional automatic compatibility behavior.
- The field configuration remains editable through the existing admin Payment Info screen.

2. Security changes
- The full card number is accepted only during the checkout request, used to validate the card and create a one-way duplicate fingerprint, then discarded.
- CVV/CVC/security-code values are never written to payment_records.
- Full card numbers are never written to payment_records.
- Only a derived last-four value and non-sensitive checkout values are retained for admin records.
- Duplicate cards are blocked by a server-side fingerprint and unique index.

3. Function changes
- Updates place_demo_order to recognize card_number, cardholder_name, expiry, cvv/cvc, and postal_code keys.
- Adds server-side Luhn and length validation for card numbers.
- Keeps the existing admin field management functions and grants unchanged.

4. Important notes
- This is demo checkout validation, not a live payment processor.
- CVV is intentionally not stored because retaining it is unsafe and unnecessary.
*/

INSERT INTO payment_info_fields (field_key, label, placeholder, required, sort_order) VALUES
  ('card_number', 'Card number', '1234 5678 9012 3456', true, 1),
  ('cardholder_name', 'Name on card', '', true, 2),
  ('expiry', 'Expiry date', 'MM/YY', true, 3),
  ('cvv', 'Security code', 'CVV', true, 4),
  ('postal_code', 'Billing postal code', 'ZIP code', true, 5)
ON CONFLICT (field_key) DO UPDATE SET
  label = EXCLUDED.label,
  placeholder = EXCLUDED.placeholder,
  required = EXCLUDED.required,
  sort_order = EXCLUDED.sort_order;

UPDATE payment_info_fields
SET required = false, sort_order = 99, label = 'Last 4 digits (automatic)'
WHERE field_key = 'card_last4';

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
  v_brand text := coalesce(p->>'payment_brand', '');
  v_card_number text := regexp_replace(coalesce(p->'payment_details'->>'card_number', ''), '\D', '', 'g');
  v_card_last4 text;
  v_fingerprint text;
  v_sum integer := 0;
  v_digit integer;
  v_double boolean := false;
  v_existing_count integer;
BEGIN
  IF v_brand NOT IN ('visa', 'mastercard', 'amex') THEN
    RAISE EXCEPTION 'Please select a valid card type.';
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

    IF v_field.field_key IN ('card_number', 'cardnumber', 'number') THEN
      v_value := regexp_replace(v_value, '\D', '', 'g');
      IF v_field.required AND v_value = '' THEN
        RAISE EXCEPTION 'Please enter your card number.';
      END IF;
      IF length(v_value) NOT IN (15, 16) THEN
        RAISE EXCEPTION 'Please enter a valid card number.';
      END IF;
      FOR i IN REVERSE length(v_value)..1 LOOP
        v_digit := substr(v_value, i, 1)::integer;
        IF v_double THEN
          v_digit := v_digit * 2;
          IF v_digit > 9 THEN v_digit := v_digit - 9; END IF;
        END IF;
        v_sum := v_sum + v_digit;
        v_double := NOT v_double;
      END LOOP;
      IF v_sum % 10 <> 0 THEN
        RAISE EXCEPTION 'Please enter a valid card number.';
      END IF;
      v_card_last4 := right(v_value, 4);
    ELSIF v_field.field_key IN ('cvv', 'cvc', 'security_code') THEN
      IF v_field.required AND v_value = '' THEN
        RAISE EXCEPTION 'Please enter your security code.';
      END IF;
      IF v_value !~ '^\d{3,4}$' THEN
        RAISE EXCEPTION 'Please enter a valid security code.';
      END IF;
    ELSIF v_field.field_key = 'card_last4' THEN
      IF v_card_last4 IS NULL AND v_value <> '' AND v_value !~ '^\d{4}$' THEN
        RAISE EXCEPTION 'Please enter valid last four digits.';
      END IF;
      IF v_card_last4 IS NULL AND v_value <> '' THEN v_card_last4 := v_value; END IF;
    ELSE
      IF v_field.required AND v_value = '' THEN
        RAISE EXCEPTION 'Please enter %.', lower(v_field.label);
      END IF;
      IF char_length(v_value) > 200 THEN
        RAISE EXCEPTION '% is too long.', v_field.label;
      END IF;
    END IF;

    IF v_field.field_key NOT IN ('card_number', 'cvv', 'cvc', 'security_code') THEN
      v_details := v_details || jsonb_build_object(v_field.field_key, v_value);
    END IF;
  END LOOP;

  IF v_card_number = '' THEN
    RAISE EXCEPTION 'Please enter your card number.';
  END IF;
  v_fingerprint := md5(v_brand || '|' || v_card_number);

  SELECT count(*) INTO v_existing_count FROM payment_records WHERE card_fingerprint = v_fingerprint;
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

  INSERT INTO orders (order_number, contact, shipping_address, shipping_method, payment_brand, payment_status, items, subtotal, discount, coupon_code, shipping_fee, total_due_now, cod_balance, created_at)
  VALUES (
    v_order_number,
    jsonb_build_object('email', btrim(v_contact->>'email'), 'phone', btrim(coalesce(v_contact->>'phone', '')), 'order_updates', coalesce((v_contact->>'order_updates')::boolean, true)),
    jsonb_build_object('first_name', btrim(v_address->>'first_name'), 'last_name', btrim(v_address->>'last_name'), 'street', btrim(v_address->>'street'), 'apartment', btrim(coalesce(v_address->>'apartment', '')), 'city', btrim(v_address->>'city'), 'state', v_address->>'state', 'zip', v_address->>'zip', 'country', 'US'),
    v_quote->>'shipping_method', v_quote->>'payment_brand',
    CASE WHEN v_quote->>'shipping_method' = 'advance' THEN 'simulated_paid' ELSE 'simulated_cod_fee_paid' END,
    v_quote->'lines', (v_quote->>'subtotal')::numeric, (v_quote->>'discount')::numeric, v_quote->>'coupon_code', (v_quote->>'shipping_fee')::numeric, (v_quote->>'total_due_now')::numeric, (v_quote->>'cod_balance')::numeric, v_created
  );

  INSERT INTO payment_records (order_number, card_brand, details, card_fingerprint, created_at)
  VALUES (v_order_number, v_brand, v_details || jsonb_build_object('card_last4', v_card_last4), v_fingerprint, v_created);

  RETURN jsonb_build_object('order_number', v_order_number);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_demo_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_demo_order(jsonb) TO anon, authenticated;
