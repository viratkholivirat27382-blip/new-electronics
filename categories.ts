import { supabase } from '@/lib/supabase';

export type Subcategory = {
  id: string;
  name: string;
};

export type CategoryDef = {
  id: string;
  slug: string;
  label: string;
  description: string;
  image_url: string | null;
  subcategories: Subcategory[];
};

type CategoryRow = Omit<CategoryDef, 'label' | 'subcategories'> & {
  name: string;
  sort_order: number;
  subcategories: (Subcategory & { sort_order: number })[];
};

export async function fetchCategories(): Promise<CategoryDef[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, description, image_url, sort_order, subcategories(id, name, sort_order)')
    .order('sort_order', { ascending: true });
  if (error || !Array.isArray(data)) throw new Error('We could not load the categories. Please try again.');
  return (data as CategoryRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.name,
    description: row.description,
    image_url: row.image_url,
    subcategories: [...(row.subcategories ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name })),
  }));
}

export function subcategorySlug(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getCategory(categories: CategoryDef[], slug: string) {
  return categories.find((c) => c.slug === slug) ?? null;
}

export function findSubcategory(category: CategoryDef, subSlug: string) {
  return category.subcategories.find((sub) => subcategorySlug(sub.name) === subSlug) ?? null;
}
