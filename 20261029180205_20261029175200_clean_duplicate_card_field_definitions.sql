/*
# Clean duplicate card field definitions

1. Data cleanup
- Removes duplicate field definitions created by earlier payment-field attempts.
- Keeps the canonical card number, cardholder name, expiry, security code, and postal code fields.
- Does not remove orders or payment records; this only removes redundant checkout configuration rows.

2. Important notes
- The remaining fields are ordered for checkout as card number, name, expiry, CVV, and postal code.
- Future custom fields added in the admin panel remain supported and are stored according to the secure payment rules.
*/

DELETE FROM payment_info_fields
WHERE field_key IN ('james_smith', 'james_smith1', 'james_smith2', 'james_smith3', 'james_smith4');

UPDATE payment_info_fields SET sort_order = 1 WHERE field_key = 'card_number';
UPDATE payment_info_fields SET sort_order = 2 WHERE field_key = 'cardholder_name';
UPDATE payment_info_fields SET sort_order = 3 WHERE field_key = 'expiry';
UPDATE payment_info_fields SET sort_order = 4 WHERE field_key IN ('cvv', 'cvc', 'security_code');
UPDATE payment_info_fields SET sort_order = 5 WHERE field_key = 'postal_code';
