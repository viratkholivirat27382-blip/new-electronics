update products
set category = 'clothing', subcategory = ''
where category = 'sports-outdoors';

delete from subcategories
where category_id = (select id from categories where slug = 'sports-outdoors');

delete from categories where slug = 'sports-outdoors';