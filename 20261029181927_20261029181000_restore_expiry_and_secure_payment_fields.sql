/*
# Restore expiry and secure payment field keys

1. Checkout fields
- Restores the standard card number, cardholder name, expiry date, security code, and postal code fields.
- Converts the existing duplicate custom labels to the secure standard keys instead of creating duplicate inputs.
- Keeps the fields required and ordered for checkout.

2. Security
- Standard card keys ensure card-number detection and server-side redaction rules apply consistently.
- Full card numbers and security codes remain excluded from saved payment details.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM payment_info_fields WHERE field_key = 'card_number') THEN
    UPDATE payment_info_fields
    SET field_key = 'card_number', label = 'Card number', placeholder = '1234 5678 9012 3456', required = true, sort_order = 1
    WHERE field_key = 'james_smith1';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM payment_info_fields WHERE field_key = 'cvv') THEN
    UPDATE payment_info_fields
    SET field_key = 'cvv', label = 'Security code', placeholder = 'CVV', required = true, sort_order = 4
    WHERE field_key = 'cvvs';
  END IF;
END $$;

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

DELETE FROM payment_info_fields
WHERE field_key IN ('james_smith1', 'cvvs');
