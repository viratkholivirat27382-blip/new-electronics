/*
# Add bank transfer checkout and approval workflow

1. Modified Tables
- `orders.payment_method` records whether an order used card, cash on delivery, or bank transfer.
- `orders.bank_transfer_details` stores the sender name, submitted amount, and payment proof image for bank-transfer review.
- `orders.payment_brand` is nullable for non-card orders.
- Existing order payment and status checks are extended for pending bank transfers.

2. New Functions
- `place_bank_transfer_order(jsonb)` validates the customer, cart, amount, and proof before creating a pending order.
- `admin_approve_bank_transfer(text)` lets an authenticated admin confirm a pending bank-transfer order.

3. Security
- Bank order creation is available through a narrowly scoped public RPC, matching the existing guest checkout model.
- Approval is restricted to authenticated administrators through `is_admin()`.
- New admin RPC execution is revoked from PUBLIC and anon.
- No existing card payment function or card validation rule is changed.

4. Important Notes
- The submitted amount must exactly match the server-calculated order total.
- Proof images are accepted only as data URLs up to 2 MB.
- Bank-transfer orders start with `pending` order status and `bank_transfer_pending` payment status.
- Approval changes them to `confirmed` and `bank_transfer_paid`.
*/

ALTER TABLE public.orders
  ALTER COLUMN payment_brand DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS bank_transfer_details jsonb;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_brand_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_brand_check
  CHECK (payment_brand IS NULL OR payment_brand = ANY (ARRAY['visa'::text, 'mastercard'::text, 'amex'::text]));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status = ANY (ARRAY[
    'simulated_paid'::text,
    'simulated_cod_fee_paid'::text,
    'bank_transfer_pending'::text,
    'bank_transfer_paid'::text
  ]));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['card'::text, 'cash_on_delivery'::text, 'bank_transfer'::text]));

CREATE OR REPLACE FUNCTION public.place_bank_transfer_order(p jsonb)
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
v_transfer jsonb := coalesce(p->'bank_transfer', '{}'::jsonb);
v_sender_name text := btrim(coalesce(v_transfer->>'sender_name', ''));
v_proof text := coalesce(v_transfer->>'proof_image', '');
v_submitted_amount numeric;
v_order_number text;
v_created timestamptz := now();
v_rows integer;
BEGIN
IF v_sender_name = '' THEN
RAISE EXCEPTION 'Please enter the sender name.';
END IF;
IF v_proof = '' OR v_proof !~ '^data:image/' OR length(v_proof) > 2097152 THEN
RAISE EXCEPTION 'Please upload a payment screenshot smaller than 2 MB.';
END IF;
BEGIN
v_submitted_amount := (v_transfer->>'amount')::numeric;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
RAISE EXCEPTION 'Please enter a valid payment amount.';
END;
IF v_submitted_amount IS NULL OR v_submitted_amount < 0 THEN
RAISE EXCEPTION 'Please enter a valid payment amount.';
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
IF btrim(coalesce(v_address->>'state', '')) = '' OR btrim(coalesce(v_address->>'zip', '')) = '' THEN
RAISE EXCEPTION 'Please complete your state and ZIP code.';
END IF;

v_quote := quote_demo_order(jsonb_set(p, '{payment_brand}', 'null'::jsonb, true));
IF v_submitted_amount <> (v_quote->>'total_due_now')::numeric THEN
RAISE EXCEPTION 'The submitted amount must match the order total.';
END IF;

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
  order_number, status, contact, shipping_address, shipping_method, payment_method,
  payment_brand, payment_status, bank_transfer_details, items, subtotal, discount,
  coupon_code, shipping_fee, total_due_now, cod_balance, created_at
)
VALUES (
  v_order_number, 'pending',
  jsonb_build_object('email', btrim(v_contact->>'email'), 'phone', btrim(coalesce(v_contact->>'phone', '')), 'order_updates', coalesce((v_contact->>'order_updates')::boolean, true)),
  jsonb_build_object('first_name', btrim(v_address->>'first_name'), 'last_name', btrim(v_address->>'last_name'), 'street', btrim(v_address->>'street'), 'apartment', btrim(coalesce(v_address->>'apartment', '')), 'city', btrim(v_address->>'city'), 'state', v_address->>'state', 'zip', v_address->>'zip', 'country', 'US'),
  v_quote->>'shipping_method', 'bank_transfer', NULL, 'bank_transfer_pending',
  jsonb_build_object('sender_name', v_sender_name, 'amount', v_submitted_amount, 'proof_image', v_proof),
  v_quote->'lines', (v_quote->>'subtotal')::numeric, (v_quote->>'discount')::numeric, v_quote->>'coupon_code', (v_quote->>'shipping_fee')::numeric, (v_quote->>'total_due_now')::numeric, (v_quote->>'cod_balance')::numeric, v_created
);

RETURN jsonb_build_object('order_number', v_order_number);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_bank_transfer(p_order_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT is_admin() THEN
RAISE EXCEPTION 'Not authorized.';
END IF;

UPDATE orders
SET status = 'confirmed', payment_status = 'bank_transfer_paid'
WHERE order_number = p_order_number
  AND payment_method = 'bank_transfer'
  AND payment_status = 'bank_transfer_pending';

IF NOT FOUND THEN
RAISE EXCEPTION 'This bank transfer is no longer pending.';
END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_bank_transfer(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_bank_transfer(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bank_transfer_order(jsonb) TO anon, authenticated;
