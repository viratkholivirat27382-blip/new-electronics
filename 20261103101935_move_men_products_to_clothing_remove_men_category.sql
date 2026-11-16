update products
set
  category = 'clothing',
  subcategory = case slug
    when 'mens-black-leather-biker-jacket' then 'Shirts'
    when 'mens-classic-leather-jacket' then 'Shirts'
    when 'mens-essential-black-oxford-shirt' then 'Hoodies'
    when 'mens-lightweight-field-jacket' then 'Shirts'
    when 'mens-silver-leather-strap-watch' then 'Shirts'
    else ''
  end
where category = 'men';

delete from categories where slug = 'men';