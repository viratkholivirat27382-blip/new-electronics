import { supabase } from '@/lib/supabase';

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  audience: 'all' | 'men' | 'women' | 'girls' | 'boys';
  short_description: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  sku: string;
  sizes: string[];
  colors: string[];
  images: string[];
  stock: number;
  is_new: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  created_at: string;
};

type ProductRow = Omit<Product, 'price' | 'compare_at_price'> & {
  price: number | string;
  compare_at_price: number | string | null;
};

const PRODUCT_COLUMNS =
  'id, slug, name, category, subcategory, audience, short_description, description, price, compare_at_price, sku, sizes, colors, images, stock, is_new, is_featured, is_best_seller, created_at';

function normalize(row: ProductRow): Product {
  return {
    ...row,
    price: Number(row.price),
    compare_at_price: row.compare_at_price === null ? null : Number(row.compare_at_price),
  };
}

// Storefront shows only this category, capped to this many products (admin "position" order decides which).
export const STOREFRONT_CATEGORY = 'electronics';
export const STOREFRONT_PRODUCT_LIMIT = 8;

export async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error('We could not load the collection. Please try again.');
  return (data as ProductRow[])
    .map(normalize)
    .filter((p) => p.category === STOREFRONT_CATEGORY)
    .slice(0, STOREFRONT_PRODUCT_LIMIT);
}

export function categoryCoverImage(products: Product[], categorySlug: string): string | null {
  return products.find((p) => p.category === categorySlug && p.images.length > 0)?.images[0] ?? null;
}

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'best-selling';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'best-selling', label: 'Best Selling' },
];

export const PRICE_RANGES: { value: string; label: string; min: number; max: number }[] = [
  { value: 'under-75', label: 'Under $75', min: 0, max: 75 },
  { value: '75-150', label: '$75 to $150', min: 75, max: 150 },
  { value: '150-plus', label: '$150 and up', min: 150, max: Infinity },
];

export type CollectionFilters = {
  query: string;
  sizes: string[];
  colors: string[];
  priceRange: string;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  sort: SortOption;
};

export function matchesSearch(product: Product, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    product.name,
    product.category,
    product.subcategory,
    product.short_description,
    product.description,
    product.colors.join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function isOnSale(product: Product) {
  return product.compare_at_price !== null && product.compare_at_price > product.price;
}

export function getDiscountPercent(product: Product) {
  if (!isOnSale(product) || product.compare_at_price === null) return 0;
  return Math.round((1 - product.price / product.compare_at_price) * 100);
}

export function applyCollectionFilters(products: Product[], filters: CollectionFilters): Product[] {
  const range = PRICE_RANGES.find((r) => r.value === filters.priceRange);
  const filtered = products.filter((product) => {
    if (!matchesSearch(product, filters.query)) return false;
    if (filters.sizes.length > 0 && !filters.sizes.some((s) => product.sizes.includes(s))) return false;
    if (filters.colors.length > 0 && !filters.colors.some((c) => product.colors.includes(c))) return false;
    if (range && (product.price < range.min || product.price >= range.max)) return false;
    if (filters.inStockOnly && product.stock <= 0) return false;
    if (filters.onSaleOnly && !isOnSale(product)) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case 'best-selling':
      sorted.sort((a, b) => Number(b.is_best_seller) - Number(a.is_best_seller));
      break;
    case 'featured':
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
      break;
  }
  return sorted;
}

export function getAvailableSizes(products: Product[]) {
  return Array.from(new Set(products.flatMap((p) => p.sizes))).sort(compareSizes);
}

export function getAvailableColors(products: Product[]) {
  return Array.from(new Set(products.flatMap((p) => p.colors))).sort();
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

function compareSizes(a: string, b: string) {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b, undefined, { numeric: true });
}
