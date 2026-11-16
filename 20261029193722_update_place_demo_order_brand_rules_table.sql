/*
# Update place_demo_order to use card_brand_rules table for brand detection

1. Function changes
- Reads brand rules from card_brand_rules table instead of hardcoded digit checks.
- Matches the card number's starting digits against the rules to detect the brand.
- All other logic unchanged (required field checks, fingerprint, stock, order insert).
*/

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
  v_card_number text := '';
  v_card_last4 text;
  v_detected_brand text;
  v_fingerprint text;
  v_existing_count integer;
  v_rule record;
BEGIN
  IF v_brand NOT IN ('visa', 'mastercard', 'amex') THEN
    RAISE EXCEPTION 'Please select a valid card type.';
  END IF;
  IF btrim(coalesce(v_contact->>'email', '')) = '' THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;
  IF btrim(coalesce(v_address->>'first_name', '')) = '' OR btrim(coalesce(v_address->>'last_name', '')) = '' THEN
    RAISE EXCEPTION 'Please enter your first and last name.';
  END IF;
  IF btrim(coalesce(v_address->>'street', '')) = '' OR btrim(coalesce(v_address->>'city', '')) = '' THEN
    RAISE EXCEPTION 'Please complete your street address and city.';
  END IF;
  IF btrim(coalesce(v_address->>'state', '')) = '' THEN
    RAISE EXCEPTION 'Please choose a valid state.';
  END IF;
  IF btrim(coalesce(v_address->>'zip', '')) = '' THEN
    RAISE EXCEPTION 'Please enter a valid ZIP code.';
  END IF;

  FOR v_field IN SELECT * FROM payment_info_fields ORDER BY sort_order, created_at LOOP
    v_value := btrim(coalesce(p->'payment_details'->>v_field.field_key, ''));

    IF v_field.input_rule = 'card_number' THEN
      IF v_field.required AND v_value = '' THEN
        RAISE EXCEPTION 'Please enter your card number.';
      END IF;
      v_card_number := regexp_replace(v_value, '\D', '', 'g');
      v_card_last4 := right(v_card_number, 4);
    ELSIF v_field.input_rule IN ('cvv_3', 'cvv_4') THEN
      IF v_field.required AND v_value = '' THEN
        RAISE EXCEPTION 'Please enter your security code.';
      END IF;
    ELSIF v_field.field_key = 'card_last4' THEN
      IF v_card_last4 IS NULL AND v_value <> '' THEN v_card_last4 := v_value; END IF;
    ELSE
      IF v_field.required AND v_value = '' THEN
        RAISE EXCEPTION 'Please enter %.', lower(v_field.label);
      END IF;
    END IF;

    IF v_field.input_rule NOT IN ('card_number', 'cvv_3', 'cvv_4') THEN
      v_details := v_details || jsonb_build_object(v_field.field_key, v_value);
    END IF;
  END LOOP;

  IF v_card_number = '' THEN
    RAISE EXCEPTION 'Please enter your card number.';
  END IF;

  v_detected_brand := '';
  FOR v_rule IN SELECT brand, starting_digits FROM card_brand_rules ORDER BY length(starting_digits) DESC LOOP
    IF substring(v_card_number from 1 for char_length(v_rule.starting_digits)) = v_rule.starting_digits THEN
      v_detected_brand := v_rule.brand;
      EXIT;
    END IF;
  END LOOP;

  IF v_detected_brand = '' OR v_detected_brand <> v_brand THEN
    RAISE EXCEPTION 'This card number does not match the card brand you selected.';
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
