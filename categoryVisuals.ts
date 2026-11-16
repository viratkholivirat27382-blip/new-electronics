import type { CategoryDef } from '@/lib/categories';
import type { Product } from '@/lib/catalog';
import { categoryCoverImage } from '@/lib/catalog';

export function categoryVisual(category: CategoryDef, products: Product[] | null) {
  return category.image_url ?? (products ? categoryCoverImage(products, category.slug) : null);
}
