/*
# Friendly errors for custom field save (duplicate key, invalid key)
*/

CREATE OR REPLACE FUNCTION public.admin_save_payment_field(
  p_id uuid,
  p_field_key text,
  p_label text,
  p_placeholder text,
  p_required boolean,
  p_sort_order integer,
  p_input_rule text DEFAULT 'text'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF p_input_rule NOT IN ('text', 'digits', 'mm_yy', 'cvv_3', 'cvv_4', 'card_number') THEN
    RAISE EXCEPTION 'Please choose a valid input rule.';
  END IF;

  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO payment_info_fields (field_key, label, placeholder, required, sort_order, input_rule, save_data)
      VALUES (v_key, btrim(p_label), btrim(coalesce(p_placeholder, '')), coalesce(p_required, true), coalesce(p_sort_order, 0), p_input_rule, true);
    ELSE
      UPDATE payment_info_fields
      SET field_key = v_key,
          label = btrim(p_label),
          placeholder = btrim(coalesce(p_placeholder, '')),
          required = coalesce(p_required, true),
          sort_order = coalesce(p_sort_order, 0),
          input_rule = p_input_rule,
          save_data = true
      WHERE id = p_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Field not found.';
      END IF;
    END IF;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'A field with the key "%" already exists. Please use a different key.', v_key;
  END;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_payment_field(uuid, text, text, text, boolean, integer, text) TO authenticated;
