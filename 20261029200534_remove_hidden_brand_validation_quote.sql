/*
# Remove hidden brand validation from quote_demo_order

- Brand was validated even when no card_number field exists in admin config
- Now only validates brand format IF a brand is provided — no longer blocks checkout
- This lets admin remove card-related fields and still get a quote
*/

CREATE OR REPLACE FUNCTION public.quote_demo_order(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
v_brand text := nullif(btrim(coalesce(p->>'payment_brand', '')), '');
BEGIN
IF jsonb_typeof(p->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'items') = 0 THEN
RAISE EXCEPTION 'Your bag is empty.';
END IF;

IF v_method NOT IN ('advance', 'cod') THEN
RAISE EXCEPTION 'Please choose a shipping and payment option.';
END IF;

-- Only validate brand format if a brand was explicitly provided
IF v_brand IS NOT NULL AND v_brand NOT IN ('visa', 'mastercard', 'amex') THEN
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
$function$;

REVOKE EXECUTE ON FUNCTION public.quote_demo_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quote_demo_order(jsonb) TO anon, authenticated;
