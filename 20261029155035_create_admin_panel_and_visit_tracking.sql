/*
# Admin access, admin panel data and visit tracking

1. New Tables
- `admins`: lists the auth user IDs allowed into the admin panel.
- `site_visits`: one row per page view on the storefront (path and time only, no personal data).

2. Functions
- `is_admin()`: true when the signed-in user is listed in `admins`.
- `record_visit(p_path)`: called by the storefront on each page view.
- `admin_dashboard()`: returns visit totals, all products with stock, and all orders with customer contact details. Admins only.
- `admin_set_stock(p_slug, p_stock)`: updates one product's stock count. Admins only.

3. Security
- RLS is enabled on both tables. Signed-in users can read only their own `admins` row.
- `site_visits` has no direct client access; it is written through `record_visit` only.
- Admin functions raise an error for anyone who is not an admin. Functions are not callable by PUBLIC or anon, except `record_visit`.

4. Important Notes
- The admin account itself is created separately, not in this migration, so no password is stored in migration history.
*/

CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON admins TO authenticated;

DROP POLICY IF EXISTS "select_own_admin_row" ON admins;
CREATE POLICY "select_own_admin_row" ON admins FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS site_visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path text NOT NULL CHECK (char_length(path) <= 300),
  visited_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.record_visit(p_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_path IS NULL OR char_length(p_path) = 0 THEN
    RETURN;
  END IF;
  INSERT INTO site_visits (path) VALUES (left(p_path, 300));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN jsonb_build_object(
    'visits_total', (SELECT count(*) FROM site_visits),
    'visits_today', (SELECT count(*) FROM site_visits WHERE visited_at >= date_trunc('day', now())),
    'visits_7d', (SELECT count(*) FROM site_visits WHERE visited_at >= now() - interval '7 days'),
    'products', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'slug', slug, 'name', name, 'sku', sku, 'category', category,
        'price', price, 'stock', stock, 'status', status
      ) ORDER BY name)
      FROM products
    ), '[]'::jsonb),
    'orders', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'order_number', order_number,
        'status', status,
        'email', contact->>'email',
        'first_name', shipping_address->>'first_name',
        'last_name', shipping_address->>'last_name',
        'total', total_due_now + cod_balance,
        'created_at', created_at
      ) ORDER BY created_at DESC)
      FROM orders
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_stock(p_slug text, p_stock integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF p_stock IS NULL OR p_stock < 0 THEN
    RAISE EXCEPTION 'Stock must be 0 or more.';
  END IF;
  UPDATE products SET stock = p_stock WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_visit(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_stock(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_visit(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_stock(text, integer) TO authenticated;
