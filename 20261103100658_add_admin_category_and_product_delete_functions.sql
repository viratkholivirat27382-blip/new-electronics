/*
# Admin functions for categories, subcategories and product deletion

1. New Functions
- `admin_create_category`: adds a category. The web address key (slug) is made from the name automatically.
- `admin_update_category`: changes a category's name, description or cover image.
- `admin_delete_category`: removes a category only when no products belong to it.
- `admin_create_subcategory`: adds a subcategory under a category.
- `admin_rename_subcategory`: renames a subcategory and updates every product that uses it.
- `admin_delete_subcategory`: removes a subcategory only when no products use it.
- `admin_delete_product`: permanently removes a product. Past orders keep their own copy of the product details, so they are not affected.

2. Security
- Every function checks is_admin() first, uses a fixed search_path, and is callable only by signed-in users. Anonymous users and the public role are blocked.
- Cover image links must start with https.

3. Important Notes
- Deleting a category or subcategory that still has products is refused with a clear message, so no product loses its category by accident.
*/

CREATE OR REPLACE FUNCTION public.admin_create_category(
  p_name text,
  p_description text DEFAULT '',
  p_image_url text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text;
  v_image text := nullif(btrim(coalesce(p_image_url, '')), '');
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Category name is required.';
  END IF;
  IF v_image IS NOT NULL AND v_image !~* '^https://' THEN
    RAISE EXCEPTION 'Category image must be a secure https link.';
  END IF;

  v_slug := trim(both '-' from lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')));
  IF v_slug = '' THEN
    v_slug := 'category-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END IF;
  IF EXISTS (SELECT 1 FROM categories WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'A category with this name already exists.';
  END IF;

  INSERT INTO categories (slug, name, description, image_url, sort_order)
  VALUES (
    v_slug,
    v_name,
    coalesce(p_description, ''),
    v_image,
    coalesce((SELECT max(sort_order) FROM categories), 0) + 1
  );

  RETURN v_slug;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_category(
  p_slug text,
  p_name text,
  p_description text DEFAULT '',
  p_image_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_image text := nullif(btrim(coalesce(p_image_url, '')), '');
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF btrim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Category name is required.';
  END IF;
  IF v_image IS NOT NULL AND v_image !~* '^https://' THEN
    RAISE EXCEPTION 'Category image must be a secure https link.';
  END IF;

  UPDATE categories
  SET name = btrim(p_name),
      description = coalesce(p_description, ''),
      image_url = v_image
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_category(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT count(*) INTO v_count FROM products WHERE category = p_slug;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'This category still has % product(s). Move or delete them first.', v_count;
  END IF;

  DELETE FROM categories WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_subcategory(p_category_slug text, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Subcategory name is required.';
  END IF;

  SELECT id INTO v_category_id FROM categories WHERE slug = p_category_slug;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Category not found.';
  END IF;
  IF EXISTS (SELECT 1 FROM subcategories WHERE category_id = v_category_id AND name = v_name) THEN
    RAISE EXCEPTION 'That subcategory already exists in this category.';
  END IF;

  INSERT INTO subcategories (category_id, name, sort_order)
  VALUES (
    v_category_id,
    v_name,
    coalesce((SELECT max(sort_order) FROM subcategories WHERE category_id = v_category_id), 0) + 1
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_rename_subcategory(p_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category_slug text;
  v_old_name text;
  v_new_name text := btrim(coalesce(p_name, ''));
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF v_new_name = '' THEN
    RAISE EXCEPTION 'Subcategory name is required.';
  END IF;

  SELECT c.slug, s.name INTO v_category_slug, v_old_name
  FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  WHERE s.id = p_id;
  IF v_category_slug IS NULL THEN
    RAISE EXCEPTION 'Subcategory not found.';
  END IF;
  IF v_new_name = v_old_name THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM subcategories s
    JOIN categories c ON c.id = s.category_id
    WHERE c.slug = v_category_slug AND s.name = v_new_name
  ) THEN
    RAISE EXCEPTION 'That subcategory already exists in this category.';
  END IF;

  UPDATE subcategories SET name = v_new_name WHERE id = p_id;
  UPDATE products SET subcategory = v_new_name
  WHERE category = v_category_slug AND subcategory = v_old_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_subcategory(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category_slug text;
  v_name text;
  v_count integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT c.slug, s.name INTO v_category_slug, v_name
  FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  WHERE s.id = p_id;
  IF v_category_slug IS NULL THEN
    RAISE EXCEPTION 'Subcategory not found.';
  END IF;

  SELECT count(*) INTO v_count FROM products WHERE category = v_category_slug AND subcategory = v_name;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'This subcategory still has % product(s). Move them first.', v_count;
  END IF;

  DELETE FROM subcategories WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_product(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  DELETE FROM products WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found.';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_create_category(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_category(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_category(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_subcategory(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_rename_subcategory(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_subcategory(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_product(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_category(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_category(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_subcategory(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rename_subcategory(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_subcategory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(text) TO authenticated;
