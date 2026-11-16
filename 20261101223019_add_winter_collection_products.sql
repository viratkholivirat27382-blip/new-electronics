/*
# Add Winter Collection products

1. Changes
- Inserts 6 new active products in the "winter" category with subcategories: Jackets & Coats, Sweaters & Knitwear, Winter Boots, Gloves & Scarves, Thermals.
- Each product has real Pexels image URLs, brand-style names, pricing with sale compare_at_price, stock, sizes, colors.
- Existing products, orders, coupons, and all other data are untouched.

2. Security
- No new tables, no RLS or policy changes. Inserts respect existing products table constraints.
*/

INSERT INTO products (slug, name, category, subcategory, short_description, description, price, compare_at_price, sku, sizes, colors, images, stock, is_new, is_featured, is_best_seller, status) VALUES
('arctic-parka-down-jacket', 'Arctic Parka Down Jacket', 'winter', 'Jackets & Coats', '850-fill down parka with fur-trimmed hood and storm-proof shell.', 'The Arctic Parka delivers serious warmth with 850-fill responsibly-sourced down, a fur-trimmed adjustable hood, and a wind- and water-resistant ripstop shell. Rated to -25C.', 159.00, 199.00, 'V-WI-001', ARRAY['XS','S','M','L','XL'], ARRAY['Black', 'Navy', 'Olive'], ARRAY['https://images.pexels.com/photos/6664959/pexels-photo-6664959.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/6789127/pexels-photo-6789127.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], 40, true, true, false, 'active'),
('summit-wool-overcoat', 'Summit Wool Overcoat', 'winter', 'Jackets & Coats', 'Tailored double-faced wool overcoat with a clean, structured silhouette.', 'Crafted from double-faced Italian wool, the Summit Overcoat features a clean notch lapel, welt pockets, and a tailored yet relaxed fit. A timeless winter staple.', 145.00, 185.00, 'V-WI-002', ARRAY['S','M','L','XL'], ARRAY['Charcoal', 'Camel'], ARRAY['https://images.pexels.com/photos/16121138/pexels-photo-16121138.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], 25, false, true, true, 'active'),
('highland-cable-knit-sweater', 'Highland Cable Knit Sweater', 'winter', 'Sweaters & Knitwear', 'Chunky cable-knit sweater in soft merino wool.', 'The Highland Cable Knit is made from 100% extra-fine merino wool with a traditional cable pattern. Soft, warm, and built to last through many winters.', 59.00, 79.00, 'V-WI-003', ARRAY['XS','S','M','L','XL'], ARRAY['Oat', 'Forest', 'Charcoal'], ARRAY['https://images.pexels.com/photos/6789127/pexels-photo-6789127.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/5788366/pexels-photo-5788366.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], 80, true, false, true, 'active'),
('glacier-insulated-snow-boot', 'Glacier Insulated Snow Boot', 'winter', 'Winter Boots', 'Waterproof insulated snow boot with grippy rubber outsole.', 'The Glacier Snow Boot features a waterproof synthetic shell, 200g insulation, and a deep-lug rubber outsole for traction on ice and snow. Rated to -30C.', 89.00, 115.00, 'V-WI-004', ARRAY['7','8','9','10','11','12'], ARRAY['Black', 'Charcoal'], ARRAY['https://images.pexels.com/photos/6609908/pexels-photo-6609908.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/5949628/pexels-photo-5949628.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], 50, true, true, false, 'active'),
('cashmere-lined-leather-gloves', 'Cashmere-Lined Leather Gloves', 'winter', 'Gloves & Scarves', 'Italian leather gloves fully lined in pure cashmere.', 'Crafted from supple Italian nappa leather and fully lined in pure cashmere, these gloves combine elegance with serious warmth. Touchscreen-compatible fingertips.', 49.00, 65.00, 'V-WI-005', ARRAY['S','M','L'], ARRAY['Black', 'Brown'], ARRAY['https://images.pexels.com/photos/1686984/pexels-photo-1686984.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/3817741/pexels-photo-3817741.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], 65, false, false, false, 'active'),
('merino-thermal-base-layer', 'Merino Thermal Base Layer', 'winter', 'Thermals', 'Lightweight 200gsm merino wool thermal top and bottom set.', 'A 200gsm merino wool base layer set that regulates temperature, wicks moisture, and resists odor. The perfect foundation for cold days in the city or on the trail.', 55.00, 72.00, 'V-WI-006', ARRAY['XS','S','M','L','XL'], ARRAY['Black', 'Grey'], ARRAY['https://images.pexels.com/photos/5788366/pexels-photo-5788366.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/5711472/pexels-photo-5711472.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'], 90, true, false, false, 'active')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  sku = EXCLUDED.sku,
  sizes = EXCLUDED.sizes,
  colors = EXCLUDED.colors,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  is_new = EXCLUDED.is_new,
  is_featured = EXCLUDED.is_featured,
  is_best_seller = EXCLUDED.is_best_seller,
  status = 'active';
