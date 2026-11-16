/*
# Count each visitor once

1. New Tables
- `site_visitors`: one row per browser visitor (random ID stored on the visitor's device), with first and last visit times. No personal data.

2. Functions
- `record_visit(p_visitor_id)`: creates or refreshes the visitor's row. Repeat visits and page refreshes never add a second visitor.
- `admin_dashboard()`: visitor totals now count unique visitors (all time, today, last 7 days). The old per-page-view `site_visits` table is kept untouched.

3. Security
- RLS is enabled on `site_visitors` with no client grants; it is only written through `record_visit`.
- The old `record_visit(text)` function is removed and replaced by the visitor-based version.

4. Important Notes
- Existing `site_visits` data is preserved.
*/

CREATE TABLE IF NOT EXISTS site_visitors (
  visitor_id uuid PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_visitors ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.record_visit(text);

CREATE OR REPLACE FUNCTION public.record_visit(p_visitor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_visitor_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO site_visitors (visitor_id) VALUES (p_visitor_id)
  ON CONFLICT (visitor_id) DO UPDATE SET last_seen_at = now();
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
    'visits_total', (SELECT count(*) FROM site_visitors),
    'visits_today', (SELECT count(*) FROM site_visitors WHERE last_seen_at >= date_trunc('day', now())),
    'visits_7d', (SELECT count(*) FROM site_visitors WHERE last_seen_at >= now() - interval '7 days'),
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

REVOKE EXECUTE ON FUNCTION public.record_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_visit(uuid) TO anon, authenticated;
