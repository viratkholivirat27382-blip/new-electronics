/*
# Create customer reviews table

1. New Tables
- `reviews`: published customer reviews shown on the storefront homepage.
  - `id` (uuid, primary key)
  - `reviewer_name` (text): first name and last initial as shown publicly
  - `reviewer_location` (text): city and country
  - `shopper_group` (text): 'men' or 'women', used to label the review
  - `rating` (smallint): 1 to 5 stars
  - `title` (text): short headline
  - `body` (text): review text
  - `is_published` (boolean): only published reviews are visible
  - `created_at` (timestamptz)

2. Security
- Row level security enabled.
- Anonymous and signed-in visitors may read published reviews only.
- No client write access; reviews are managed directly in the database.

3. Notes
- The storefront has no sign-in screen, so the policy targets anon and authenticated.
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL,
  reviewer_location text NOT NULL,
  shopper_group text NOT NULL CHECK (shopper_group IN ('men', 'women')),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL,
  body text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON reviews TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_published_reviews" ON reviews;
CREATE POLICY "anon_select_published_reviews" ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_published);
