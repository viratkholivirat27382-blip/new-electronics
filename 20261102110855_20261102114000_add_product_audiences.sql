/*
# Add audience collections to products

1. New Columns
- `products.audience` stores the collection audience for catalog products.
- Allowed values are `all`, `men`, `women`, `girls`, and `boys`.
- Existing products remain in the shared `all` collection.

2. Data Changes
- Add four audience-specific product groups by copying four existing winter, clothing, or shoes products for each audience.
- Preserve the original products and all existing order data.
- New products use unique slugs and SKUs and remain active.

3. Security
- No access policy changes are needed because the existing products table policies continue to protect catalog reads and admin writes.

4. Important Notes
- Audience-specific copies keep the existing product images and details so the storefront has real catalog items immediately.
- The operation is idempotent: rerunning it will not create duplicate audience products.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_audience_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_audience_check
      CHECK (audience IN ('all', 'men', 'women', 'girls', 'boys'));
  END IF;
END $$;

WITH base_products AS (
  SELECT *
  FROM public.products
  WHERE status = 'active'
    AND audience = 'all'
    AND category IN ('winter', 'clothing', 'shoes-sneakers')
  ORDER BY created_at, slug
  LIMIT 4
), audiences AS (
  SELECT * FROM (VALUES ('men'), ('women'), ('girls'), ('boys')) AS values(audience)
)
INSERT INTO public.products (
  slug, name, category, subcategory, short_description, description, price,
  compare_at_price, sku, sizes, colors, images, stock, is_new,
  is_featured, is_best_seller, status, audience
)
SELECT
  base.slug || '-' || audiences.audience,
  audiences.audience || ' ' || base.name,
  base.category,
  base.subcategory,
  base.short_description,
  base.description,
  base.price,
  base.compare_at_price,
  base.sku || '-' || upper(audiences.audience),
  base.sizes,
  base.colors,
  base.images,
  base.stock,
  true,
  false,
  false,
  'active',
  audiences.audience
FROM base_products base
CROSS JOIN audiences
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products existing
  WHERE existing.slug = base.slug || '-' || audiences.audience
);
