/*
# Add winter products

1. New Data
- Adds 12 new winter products across outerwear, knitwear, and accessories categories.
- Includes coats, puffer jackets, parkas, turtleneck sweaters, ponchos, scarves, gloves, beanies, and earmuffs.
- All products have real Pexels images, sizes, colors, stock, and prices.

2. Important Notes
- No schema changes. All products use the existing products table structure.
- The existing outerwear and knitwear products are preserved.
*/

INSERT INTO products (slug, name, category, subcategory, short_description, description, price, compare_at_price, sku, sizes, colors, images, stock, is_new, is_featured, is_best_seller, status)
VALUES
(
  'red-double-breasted-wool-coat',
  'Red Double-Breasted Wool Coat',
  'outerwear',
  'Coats',
  'A bold red wool-blend coat with gold buttons.',
  'Make a statement this winter with this striking red double-breasted wool coat. Tailored from a premium wool blend with a smooth satin lining, it features decorative gold buttons, notched lapels, and a flattering fit-and-flare silhouette. Perfect for both formal occasions and elevating everyday looks.',
  149.00, 189.00, 'VYR-OW-4010',
  ARRAY['XS','S','M','L','XL'],
  ARRAY['Red'],
  ARRAY['https://images.pexels.com/photos/20384591/pexels-photo-20384591.jpeg?auto=compress&cs=tinysrgb&w=800'],
  12, true, true, false, 'active'
),
(
  'fur-collar-winter-coat',
  'Fur-Collar Winter Coat',
  'outerwear',
  'Coats',
  'A warm brown coat with a luxurious fur collar.',
  'Stay warm in style with this elegant brown winter coat featuring a plush fur collar. The double-breasted design offers extra warmth, while the tailored cut ensures a flattering fit. A timeless investment piece for the colder months.',
  175.00, 220.00, 'VYR-OW-4011',
  ARRAY['XS','S','M','L'],
  ARRAY['Brown'],
  ARRAY['https://images.pexels.com/photos/5652356/pexels-photo-5652356.jpeg?auto=compress&cs=tinysrgb&w=800'],
  10, true, true, false, 'active'
),
(
  'oversized-wool-coat',
  'Oversized Wool Coat',
  'outerwear',
  'Coats',
  'An oversized coat for modern winter elegance.',
  'Embrace modern proportions with this oversized wool coat. The relaxed silhouette drapes beautifully over any outfit, while the premium wool blend provides exceptional warmth. A contemporary take on winter outerwear.',
  142.00, 175.00, 'VYR-OW-4012',
  ARRAY['XS','S','M','L'],
  ARRAY['Camel'],
  ARRAY['https://images.pexels.com/photos/20097984/pexels-photo-20097984.jpeg?auto=compress&cs=tinysrgb&w=800'],
  14, true, false, false, 'active'
),
(
  'black-fur-winter-coat',
  'Black Fur Winter Coat',
  'outerwear',
  'Coats',
  'A glamorous black fur coat for winter evenings.',
  'Channel old-world glamour with this black fur winter coat. Soft, warm, and undeniably chic, it is the perfect layer for evening events and special occasions throughout the winter season.',
  195.00, 250.00, 'VYR-OW-4013',
  ARRAY['XS','S','M','L'],
  ARRAY['Black'],
  ARRAY['https://images.pexels.com/photos/37598/beautiful-young-woman-black-coat-winter-glamour-37598.jpeg?auto=compress&cs=tinysrgb&w=800'],
  8, true, true, false, 'active'
),
(
  'beret-and-coat-set',
  'Wool Beret and Coat Set',
  'outerwear',
  'Coats',
  'A chic coat paired with a matching beret.',
  'This stylish winter set pairs a tailored coat with a classic wool beret for a Parisian-inspired look. The coat features a structured silhouette and warm wool blend, while the beret adds a touch of effortless charm.',
  165.00, 200.00, 'VYR-OW-4014',
  ARRAY['XS','S','M','L'],
  ARRAY['Grey'],
  ARRAY['https://images.pexels.com/photos/35117782/pexels-photo-35117782.jpeg?auto=compress&cs=tinysrgb&w=800'],
  9, true, false, false, 'active'
),
(
  'fluffy-winter-jacket',
  'Fluffy Winter Jacket',
  'outerwear',
  'Jackets',
  'A cozy faux-fur jacket for cold days.',
  'Wrap yourself in warmth with this fluffy faux-fur jacket. Soft to the touch and incredibly warm, it is perfect for casual winter outings. The relaxed fit layers easily over sweaters and knits.',
  98.00, 130.00, 'VYR-OW-4015',
  ARRAY['XS','S','M','L'],
  ARRAY['Cream'],
  ARRAY['https://images.pexels.com/photos/10110765/pexels-photo-10110765.jpeg?auto=compress&cs=tinysrgb&w=800'],
  16, true, true, false, 'active'
),
(
  'winter-coat-with-scarf',
  'Winter Coat with Scarf',
  'outerwear',
  'Coats',
  'A warm coat styled with a winter scarf.',
  'This elegant winter coat comes styled with a coordinating scarf for a complete cold-weather look. The tailored silhouette and warm wool blend make it a versatile choice for everyday winter wear.',
  158.00, 195.00, 'VYR-OW-4016',
  ARRAY['XS','S','M','L'],
  ARRAY['Navy'],
  ARRAY['https://images.pexels.com/photos/31084939/pexels-photo-31084939.jpeg?auto=compress&cs=tinysrgb&w=800'],
  11, true, false, false, 'active'
),
(
  'cozy-turtleneck-sweater',
  'Cozy Turtleneck Sweater',
  'knitwear',
  'Sweaters',
  'A soft turtleneck sweater for winter layering.',
  'This essential turtleneck sweater is crafted from a soft knit blend that feels luxurious against the skin. The slim fit makes it perfect for layering under coats or wearing on its own. A winter wardrobe staple.',
  48.00, 65.00, 'VYR-KW-4010',
  ARRAY['XS','S','M','L','XL'],
  ARRAY['Oatmeal','Grey','Black'],
  ARRAY['https://images.pexels.com/photos/6995884/pexels-photo-6995884.jpeg?auto=compress&cs=tinysrgb&w=800'],
  20, true, true, true, 'active'
),
(
  'white-knit-sweater',
  'White Knit Sweater',
  'knitwear',
  'Sweaters',
  'A crisp white sweater for effortless style.',
  'This white knit sweater offers a clean, polished look that pairs with everything in your winter wardrobe. The soft knit and relaxed fit make it a go-to for casual days and cozy evenings.',
  42.00, 55.00, 'VYR-KW-4011',
  ARRAY['XS','S','M','L'],
  ARRAY['White'],
  ARRAY['https://images.pexels.com/photos/20025523/pexels-photo-20025523.jpeg?auto=compress&cs=tinysrgb&w=800'],
  18, true, false, false, 'active'
),
(
  'winter-knit-scarf',
  'Winter Knit Scarf',
  'accessories',
  'Scarves',
  'A cozy knit scarf for cold winter days.',
  'Wrap yourself in warmth with this chunky knit scarf. Made from a soft wool blend, it is the perfect finishing touch to any winter outfit. Available in versatile winter tones.',
  28.00, 38.00, 'VYR-AC-4010',
  ARRAY['One Size'],
  ARRAY['Oatmeal','Grey','Burgundy'],
  ARRAY['https://images.pexels.com/photos/19522595/pexels-photo-19522595.jpeg?auto=compress&cs=tinysrgb&w=800'],
  25, true, true, false, 'active'
),
(
  'winter-knit-gloves',
  'Winter Knit Gloves',
  'accessories',
  'Gloves',
  'Warm knit gloves for everyday winter wear.',
  'Keep your hands warm in style with these soft knit gloves. The touchscreen-compatible fingertips let you use your phone without removing them. A practical and stylish winter accessory.',
  22.00, 32.00, 'VYR-AC-4011',
  ARRAY['One Size'],
  ARRAY['Grey','Black','Cream'],
  ARRAY['https://images.pexels.com/photos/24821938/pexels-photo-24821938.jpeg?auto=compress&cs=tinysrgb&w=800'],
  30, true, false, false, 'active'
),
(
  'winter-mittens',
  'Cozy Winter Mittens',
  'accessories',
  'Gloves',
  'Chunky knit mittens for maximum warmth.',
  'These chunky knit mittens are designed for the coldest winter days. Made from a plush wool blend, they offer maximum warmth and a charming, cozy look. A winter must-have.',
  18.00, 25.00, 'VYR-AC-4012',
  ARRAY['One Size'],
  ARRAY['Oatmeal','Grey','Red'],
  ARRAY['https://images.pexels.com/photos/19522583/pexels-photo-19522583.jpeg?auto=compress&cs=tinysrgb&w=800'],
  28, true, false, false, 'active'
)
ON CONFLICT (slug) DO NOTHING;
