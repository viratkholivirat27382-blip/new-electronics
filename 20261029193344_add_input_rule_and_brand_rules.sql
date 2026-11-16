/*
# Add input_rule to payment_info_fields and card_brand_rules table

1. Schema changes
- Adds `input_rule` column to payment_info_fields: 'text', 'digits', 'mm_yy', 'cvv_3', 'cvv_4', 'card_number'. Default 'text'.
- Creates `card_brand_rules` table: brand + starting_digits prefix. Used to detect which card brand a number belongs to.
- Seeds default brand rules: visa->4, mastercard->5, amex->3.

2. Security
- RLS enabled on card_brand_rules. Anon/authenticated can SELECT (so checkout can read rules). Admin functions (SECURITY DEFINER) handle writes.
*/

ALTER TABLE payment_info_fields ADD COLUMN IF NOT EXISTS input_rule text NOT NULL DEFAULT 'text'
  CHECK (input_rule IN ('text', 'digits', 'mm_yy', 'cvv_3', 'cvv_4', 'card_number'));

CREATE TABLE IF NOT EXISTS card_brand_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL CHECK (brand IN ('visa', 'mastercard', 'amex')),
  starting_digits text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_brand_rules ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON card_brand_rules TO anon, authenticated;

CREATE POLICY "read_brand_rules" ON card_brand_rules FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO card_brand_rules (brand, starting_digits) VALUES
  ('visa', '4'),
  ('mastercard', '5'),
  ('amex', '3')
ON CONFLICT DO NOTHING;
