/*
# Create newsletter subscribers

1. New Tables
- `newsletter_subscribers`: one row per email that subscribed from the storefront newsletter form.
  - `id` (uuid, primary key)
  - `email` (text, unique, lowercase, basic format check)
  - `created_at` (timestamptz)

2. Security
- Row level security is enabled.
- Visitors (anon and signed-in) may only INSERT a row. They cannot read, update or delete subscribers.
- Only the admin and server-side code can read the list, through the existing service role.
*/

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 5 AND 254 AND email LIKE '%_@_%.__%'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON newsletter_subscribers TO anon, authenticated;

DROP POLICY IF EXISTS "anon_insert_newsletter_subscribers" ON newsletter_subscribers;
CREATE POLICY "anon_insert_newsletter_subscribers" ON newsletter_subscribers FOR INSERT
TO anon, authenticated WITH CHECK (true);
