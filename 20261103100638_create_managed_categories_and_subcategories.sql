/*
# Managed categories and subcategories

1. New Tables
- `categories`: the shop's categories (slug, name, description, cover image, display order). Seeded with the 7 categories the storefront used to hardcode.
- `subcategories`: subcategories belonging to a category (unique name per category).

2. Data Changes
- Existing subcategory names that were used by products under a valid category are added to `subcategories` so nothing disappears.
- Product categories written with different capitalisation (for example "Electronics") are converted to the matching lowercase slug.
- Products whose category is not a managed category (for example "men") are left as they are. They stay hidden on the storefront until an admin assigns a real category.

3. Security
- Row level security enabled on both tables. Anyone (shop visitors and admins) can read them.
- Only the admin functions added in a later migration can change them. Direct insert, update and delete are revoked from the public roles.
- A trigger on products makes sure a product's category and subcategory match an existing entry whenever either is set or changed.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON categories FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON subcategories FROM PUBLIC, anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON subcategories TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_subcategories" ON subcategories;
CREATE POLICY "anon_select_subcategories" ON subcategories FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO categories (slug, name, description, image_url, sort_order) VALUES
  ('winter', 'Winter Collection', 'Cozy, warm and ready for the cold.', 'https://images.pexels.com/photos/9097902/pexels-photo-9097902.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 1),
  ('electronics', 'Electronics', 'Headphones, laptops, wearables and smart home.', 'https://images.pexels.com/photos/3394666/pexels-photo-3394666.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 2),
  ('clothing', 'Clothing', 'Tees, hoodies, outerwear and tailored pieces.', 'https://images.pexels.com/photos/8346027/pexels-photo-8346027.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 3),
  ('shoes-sneakers', 'Shoes & Sneakers', 'Performance meets design.', 'https://images.pexels.com/photos/18155790/pexels-photo-18155790.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 4),
  ('home-living', 'Home & Living', 'Objects for slower living.', 'https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 5),
  ('beauty-personal-care', 'Beauty & Personal Care', 'Skin, scent & self-care.', 'https://images.pexels.com/photos/4110347/pexels-photo-4110347.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 6),
  ('sports-outdoors', 'Sports & Outdoors', 'Train hard, travel light.', 'https://images.pexels.com/photos/8692281/pexels-photo-8692281.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subcategories (category_id, name, sort_order)
SELECT c.id, v.name, v.sort_order
FROM (VALUES
  ('winter', 'Jackets & Coats', 1), ('winter', 'Sweaters & Knitwear', 2), ('winter', 'Winter Boots', 3), ('winter', 'Gloves & Scarves', 4), ('winter', 'Thermals', 5),
  ('electronics', 'Headphones', 1), ('electronics', 'Laptops', 2), ('electronics', 'Wearables', 3), ('electronics', 'Speakers', 4), ('electronics', 'Accessories', 5),
  ('clothing', 'Tees', 1), ('clothing', 'Hoodies', 2), ('clothing', 'Outerwear', 3), ('clothing', 'Shirts', 4), ('clothing', 'Tailoring', 5),
  ('shoes-sneakers', 'Runners', 1), ('shoes-sneakers', 'Sneakers', 2), ('shoes-sneakers', 'Boots', 3), ('shoes-sneakers', 'Trainers', 4),
  ('home-living', 'Furniture', 1), ('home-living', 'Textiles', 2), ('home-living', 'Lighting', 3), ('home-living', 'Tableware', 4), ('home-living', 'Decor', 5),
  ('beauty-personal-care', 'Skincare', 1), ('beauty-personal-care', 'Fragrance', 2), ('beauty-personal-care', 'Tools', 3),
  ('sports-outdoors', 'Strength', 1), ('sports-outdoors', 'Cardio', 2), ('sports-outdoors', 'Outdoor', 3), ('sports-outdoors', 'Hydration', 4)
) AS v(slug, name, sort_order)
JOIN categories c ON c.slug = v.slug
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (category_id, name, sort_order)
SELECT c.id, p.subcategory, 100
FROM (SELECT DISTINCT lower(category) AS category_slug, subcategory FROM products WHERE btrim(subcategory) <> '') p
JOIN categories c ON c.slug = p.category_slug
ON CONFLICT (category_id, name) DO NOTHING;

UPDATE products
SET category = lower(category)
WHERE category <> lower(category)
  AND lower(category) IN (SELECT slug FROM categories);

CREATE OR REPLACE FUNCTION public.validate_product_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = NEW.category) THEN
    RAISE EXCEPTION 'Please choose a category from the list.';
  END IF;
  IF btrim(coalesce(NEW.subcategory, '')) <> '' AND NOT EXISTS (
    SELECT 1
    FROM subcategories s
    JOIN categories c ON c.id = s.category_id
    WHERE c.slug = NEW.category AND s.name = NEW.subcategory
  ) THEN
    RAISE EXCEPTION 'Please choose a subcategory from the list.';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_product_category() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS products_validate_category ON products;
CREATE TRIGGER products_validate_category
  BEFORE INSERT OR UPDATE OF category, subcategory ON products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_category();
