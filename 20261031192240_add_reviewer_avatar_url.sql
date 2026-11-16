/*
# Add reviewer photo to customer reviews

1. Modified Tables
- `reviews`: new optional column `avatar_url` (text) holding a link to the reviewer's photo.

2. Security
- No change to row level security or grants; the existing anon and authenticated read policy covers the new column.

3. Notes
- Existing rows are left unchanged; the photo is filled in separately.
*/

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS avatar_url text;
