/*
# Add admin function to read every product's display position

1. New Functions
- `admin_product_positions()`: admin-only. Returns each product's slug and its display position number, including draft and archived products that the public cannot read.

2. Security
- Checks the caller is an admin before returning any rows.
- Executable only by signed-in users and service_role. PUBLIC and anon are revoked.

3. Notes
- Read-only. Safe to re-run (CREATE OR REPLACE).
*/

CREATE OR REPLACE FUNCTION public.admin_product_positions()
RETURNS TABLE (slug text, sort_order integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  RETURN QUERY SELECT p.slug, p.sort_order FROM products p;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_product_positions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_product_positions() TO authenticated, service_role;
