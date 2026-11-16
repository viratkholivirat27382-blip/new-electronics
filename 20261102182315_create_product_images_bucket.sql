/*
# Create product images storage bucket

1. New Storage
- `product-images` public bucket that holds product photos uploaded from the admin inventory.
- Limits: 5 MB per file, JPEG / PNG / WebP / GIF only.

2. Security
- Anyone can view images through their public URL (needed for the storefront).
- Only signed-in admins (checked with the existing is_admin() function) can upload files into this bucket.
- No update or delete policy is added, so admins cannot overwrite or remove files through the browser.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "admins_upload_product_images" ON storage.objects;
CREATE POLICY "admins_upload_product_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
