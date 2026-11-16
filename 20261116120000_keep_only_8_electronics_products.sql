/*
# Keep only 8 electronics products

1. Changes
- Deletes every product except the first 8 electronics products (ELEC-001 to ELEC-008).
- No tables, columns, policies, payment data or admin functions are changed.
*/

DELETE FROM products
WHERE slug NOT IN (
  'apple-airpods-2nd-generation',
  'apple-airpods-pro-2nd-generation',
  'sony-wh-1000xm4-headphones',
  'jbl-clip-4-speaker',
  'amazon-fire-tv-stick-4k',
  'amazon-echo-dot-5th-gen',
  'roku-express-4k-plus',
  'blink-outdoor-4-camera'
);
