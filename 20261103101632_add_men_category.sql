insert into categories (slug, name, description, image_url, sort_order)
values ('men', 'Men', 'Clothing, accessories and essentials for men', null, (select coalesce(max(sort_order), 0) + 1 from categories))
on conflict (slug) do nothing;