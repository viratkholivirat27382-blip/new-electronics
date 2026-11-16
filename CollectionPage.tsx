import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FilterDrawerButton, FilterPanel } from '@/components/collection/FilterPanel';
import { ProductCard } from '@/components/product/ProductCard';
import { buttonOutline, buttonPrimary, eyebrow } from '@/components/ui/styles';
import {
  applyCollectionFilters,
  getAvailableColors,
  getAvailableSizes,
  isOnSale,
  matchesSearch,
  SORT_OPTIONS,
  type CollectionFilters,
  type Product,
  type SortOption,
} from '@/lib/catalog';
import { useCategories } from '@/context/useCategories';
import { findSubcategory, getCategory, subcategorySlug } from '@/lib/categories';
import { useActiveProducts } from '@/lib/useActiveProducts';

type CollectionKind = 'all' | 'category' | 'new' | 'best' | 'sale' | 'search';

const PAGE_SIZE = 12;

const COLLECTION_AUDIENCES = [
  { value: 'all', label: 'All collection' },
  { value: 'men', label: "Men's" },
  { value: 'women', label: "Women's" },
  { value: 'girls', label: 'Girls' },
  { value: 'boys', label: 'Boys' },
] as const;
const AUDIENCE_COLLECTIONS = new Set(['winter', 'clothing', 'shoes-sneakers']);

function parseFilters(params: URLSearchParams): CollectionFilters {
  const list = (key: string) => (params.get(key) ?? '').split(',').filter(Boolean);
  const sortParam = params.get('sort');
  const sort = SORT_OPTIONS.some((option) => option.value === sortParam) ? (sortParam as SortOption) : 'featured';
  return {
    query: params.get('q') ?? '',
    sizes: list('size'),
    colors: list('color'),
    priceRange: params.get('price') ?? '',
    inStockOnly: params.get('stock') === '1',
    onSaleOnly: params.get('sale') === '1',
    sort,
  };
}

function countActiveFilters(filters: CollectionFilters) {
  return (
    Number(filters.sizes.length > 0) +
    Number(filters.colors.length > 0) +
    Number(filters.priceRange !== '') +
    Number(filters.inStockOnly) +
    Number(filters.onSaleOnly) +
    Number(filters.query.trim() !== '')
  );
}

function isInScope(product: Product, kind: CollectionKind, slug: string, query: string, subLabel: string | null, audience: string) {
  switch (kind) {
    case 'category':
      return product.category === slug
        && (subLabel === null || product.subcategory === subLabel)
        && (audience === 'all' || product.audience === audience);
    case 'new':
      return product.is_new;
    case 'best':
      return product.is_best_seller;
    case 'sale':
      return isOnSale(product);
    case 'search':
      return matchesSearch(product, query);
    default:
      return true;
  }
}

function getTitle(kind: CollectionKind, query: string, subLabel: string | null, categoryLabel: string | null) {
  switch (kind) {
    case 'category':
      return subLabel ?? categoryLabel ?? 'Collection';
    case 'new':
      return 'New Arrivals';
    case 'best':
      return 'Best Sellers';
    case 'sale':
      return 'Sale';
    case 'search':
      return query ? `Results for "${query}"` : 'Search';
    default:
      return 'Shop All';
  }
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[4/3] rounded-xl bg-neutral-100" />
          <div className="mt-4 h-3 w-2/3 bg-neutral-200" />
          <div className="mt-2 h-3 w-1/3 bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}

export function CollectionPage({ kind }: { kind: CollectionKind }) {
  const { slug = '', sub = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, error, retry } = useActiveProducts();
  const { categories, error: categoriesError, reload: reloadCategories } = useCategories();
  const shownError = error ?? categoriesError;
  const retryAll = () => {
    retry();
    reloadCategories();
  };
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = parseFilters(searchParams);
  const audience = searchParams.get('audience') ?? 'all';
  const activeCount = countActiveFilters(filters);
  const category = kind === 'category' && categories ? getCategory(categories, slug) : null;
  const subcategory = category && sub ? findSubcategory(category, sub) : null;
  const subLabel = subcategory?.name ?? null;
  const categoryValid = kind !== 'category' || categories === null || (category !== null && (!sub || subcategory !== null));

  const scoped = (products ?? []).filter((product) => isInScope(product, kind, slug, filters.query, subLabel, audience));
  const results = applyCollectionFilters(scoped, filters);
  const shown = results.slice(0, visibleCount);
  const title = getTitle(kind, filters.query, subLabel, category?.label ?? null);

  const updateParam = (key: string, value: string | null) => {
    setVisibleCount(PAGE_SIZE);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const toggleListParam = (key: 'size' | 'color', value: string) => {
    const current = key === 'size' ? filters.sizes : filters.colors;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updateParam(key, next.length ? next.join(',') : null);
  };

  const clearAll = () => {
    setVisibleCount(PAGE_SIZE);
    if (kind === 'category' && audience !== 'all') {
      setSearchParams({ audience });
      return;
    }
    setSearchParams(kind === 'search' && filters.query ? { q: filters.query } : {});
  };

  if (!categoryValid) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className={eyebrow}>Collection</p>
        <h1 className="mt-4 font-heading text-4xl font-bold">We could not find that collection</h1>
        <Link to="/categories" className={`${buttonPrimary} mt-8`}>View all categories</Link>
      </section>
    );
  }

  const panel = (
    <FilterPanel
      filters={filters}
      availableSizes={getAvailableSizes(scoped)}
      availableColors={getAvailableColors(scoped)}
      activeCount={activeCount}
      onToggleList={toggleListParam}
      onSetValue={(key, value) => updateParam(key, value || null)}
      onClear={clearAll}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 lg:px-8 lg:pb-16">
      <header className="flex flex-col gap-2 border-b border-neutral-200 pb-8">
        <p className={eyebrow}>The collection</p>
        <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-sm text-neutral-500">
          {products ? `${results.length} ${results.length === 1 ? 'piece' : 'pieces'}` : 'Loading the collection'}
        </p>
        {category && (
          <>
            {AUDIENCE_COLLECTIONS.has(category.slug) && (
              <ul className="mt-4 flex flex-wrap gap-1.5 sm:gap-2" aria-label={`${category.label} audience collections`}>
                {COLLECTION_AUDIENCES.map((option) => (
                  <li key={option.value}>
                    <Link
                      to={option.value === 'all' ? `/category/${category.slug}` : `/category/${category.slug}?audience=${option.value}`}
                      aria-current={audience === option.value ? 'page' : undefined}
                      className={`inline-flex rounded-full border px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-luxe ${audience === option.value ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-700 hover:border-ink hover:text-ink'}`}
                    >
                      {option.value === 'all' ? <><span className="sm:hidden">All</span><span className="hidden sm:inline">All collection</span></> : option.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {audience === 'all' && category.subcategories.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2" aria-label={`${category.label} subcategories`}>
              <li>
                <Link
                  to={`/category/${category.slug}`}
                  aria-current={subLabel === null ? 'page' : undefined}
                  className={`inline-flex rounded-full border px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-luxe ${subLabel === null ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-700 hover:border-ink hover:text-ink'}`}
                >
                  All {category.label}
                </Link>
              </li>
              {category.subcategories.map((sub) => {
                const current = subLabel === sub.name;
                return (
                  <li key={sub.id}>
                    <Link
                      to={`/category/${category.slug}/${subcategorySlug(sub.name)}`}
                      aria-current={current ? 'page' : undefined}
                      className={`inline-flex rounded-full border px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-luxe ${current ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-700 hover:border-ink hover:text-ink'}`}
                    >
                      {sub.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
            )}
          </>
        )}
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-12">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-28">{panel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center gap-3">
            <div className="lg:hidden">
              <FilterDrawerButton activeCount={activeCount} onOpen={() => setDrawerOpen(true)} />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <label htmlFor="collection-sort" className="hidden text-xs uppercase tracking-luxe text-neutral-500 sm:block">
                Sort
              </label>
              <select
                id="collection-sort"
                value={filters.sort}
                onChange={(event) => updateParam('sort', event.target.value === 'featured' ? null : event.target.value)}
                className="border border-neutral-300 bg-white px-3 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {shownError && (
            <div role="alert" className="border border-crimson-600 bg-crimson-700/10 p-6">
              <p className="text-sm">{shownError}</p>
              <button type="button" onClick={retryAll} className={`${buttonOutline} mt-4`}>
                Try again
              </button>
            </div>
          )}

          {!shownError && !products && <LoadingGrid />}

          {products && results.length === 0 && (
            <div className="border border-neutral-200 px-6 py-16 text-center">
              <h2 className="font-heading text-3xl font-bold">Nothing matches these filters</h2>
              <p className="mt-3 text-sm text-neutral-500">Try removing a filter or browse the full collection.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button type="button" onClick={clearAll} className={buttonPrimary}>Clear all filters</button>
                <Link to="/shop" className={buttonOutline}>Shop all</Link>
              </div>
            </div>
          )}

          {products && results.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {shown.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {visibleCount < results.length && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    className={buttonOutline}
                  >
                    Load more ({results.length - visibleCount} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} aria-label="Close filters" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6">
            <FilterPanel
              filters={filters}
              availableSizes={getAvailableSizes(scoped)}
              availableColors={getAvailableColors(scoped)}
              activeCount={activeCount}
              onToggleList={toggleListParam}
              onSetValue={(key, value) => updateParam(key, value || null)}
              onClear={clearAll}
              onClose={() => setDrawerOpen(false)}
            />
            <button type="button" onClick={() => setDrawerOpen(false)} className={`${buttonPrimary} mt-8 w-full`}>
              Show {results.length} {results.length === 1 ? 'piece' : 'pieces'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
