import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, Settings2 } from 'lucide-react';
import { CategoryManagerDialog } from '@/components/admin/CategoryManagerDialog';
import { InventoryRow } from '@/components/admin/InventoryRow';
import { ProductDialog } from '@/components/admin/ProductDialog';
import { buttonOutline, buttonPrimary } from '@/components/ui/styles';
import { useCategories } from '@/context/useCategories';
import type { AdminProduct } from '@/lib/admin';
import { fetchProductPositions } from '@/lib/productPositions';

type InventoryTabProps = {
  products: AdminProduct[];
  onProductSaved: (product: AdminProduct) => void;
  onProductCreated: (product: AdminProduct) => void;
  onProductDeleted: (slug: string) => void;
  onCatalogChanged: () => void;
};

type FlagFilter = 'all' | 'best_seller' | 'featured' | 'new';

type DialogState = { mode: 'create'; category: string } | { mode: 'edit'; product: AdminProduct } | null;

const FLAG_FILTERS: { id: FlagFilter; label: string }[] = [
  { id: 'all', label: 'All products' },
  { id: 'best_seller', label: 'Best sellers' },
  { id: 'featured', label: 'Featured' },
  { id: 'new', label: 'New arrivals' },
];

function matchesFlag(product: AdminProduct, flag: FlagFilter) {
  if (flag === 'best_seller') return product.is_best_seller;
  if (flag === 'featured') return product.is_featured;
  if (flag === 'new') return product.is_new;
  return true;
}

function chipClass(active: boolean) {
  return `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
    active ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-ink hover:text-ink'
  }`;
}

export function InventoryTab({ products, onProductSaved, onProductCreated, onProductDeleted, onCatalogChanged }: InventoryTabProps) {
  const { categories, error: categoriesError, reload: reloadCategories } = useCategories();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [flag, setFlag] = useState<FlagFilter>('all');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Record<string, number> | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProductPositions()
      .then((result) => {
        if (!active) return;
        setPositions(result);
        setPositionsError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setPositionsError(err instanceof Error ? err.message : 'Product order could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [products]);

  const groupSlugs = useMemo(() => {
    if (!categories) return [];
    const managed = categories.map((category) => category.slug);
    const managedSet = new Set(managed);
    const unmanaged = Array.from(new Set(products.map((product) => product.category).filter((slug) => !managedSet.has(slug)))).sort();
    return [...managed, ...unmanaged];
  }, [categories, products]);

  if (categories === null) {
    return categoriesError ? (
      <div role="alert" className="rounded-lg border border-crimson-600 bg-crimson-700/10 p-6">
        <p className="text-sm text-ink">{categoriesError}</p>
        <button type="button" onClick={reloadCategories} className={`${buttonOutline} mt-4`}>Try again</button>
      </div>
    ) : (
      <p className="text-sm text-neutral-600" aria-busy="true">Loading categories...</p>
    );
  }

  const managedSlugs = new Set(categories.map((category) => category.slug));
  const labelFor = (slug: string) => categories.find((category) => category.slug === slug)?.label ?? slug;
  const unmanagedCount = products.filter((product) => !managedSlugs.has(product.category)).length;

  const positionOf = (slug: string) => positions?.[slug] ?? 0;

  const nextPositionIn = (slug: string) => {
    const inCategory = products.filter((product) => product.category === slug).map((product) => positionOf(product.slug));
    return inCategory.length === 0 ? 1 : Math.max(...inCategory) + 1;
  };

  const groups = groupSlugs
    .filter((slug) => categoryFilter === 'all' || slug === categoryFilter)
    .map((slug) => ({
      slug,
      label: labelFor(slug),
      managed: managedSlugs.has(slug),
      items: products
        .filter((product) => product.category === slug && matchesFlag(product, flag))
        .sort((a, b) => positionOf(a.slug) - positionOf(b.slug) || a.name.localeCompare(b.name)),
    }));

  const isOpen = (slug: string) => !collapsed[slug];
  const toggle = (slug: string) => setCollapsed((current) => ({ ...current, [slug]: !current[slug] }));

  const handleSaved = (product: AdminProduct, position: number) => {
    setPositions((current) => ({ ...(current ?? {}), [product.slug]: position }));
    if (dialog?.mode === 'create') onProductCreated(product);
    else onProductSaved(product);
    setDialog(null);
  };

  return (
    <div className="space-y-6">
      {unmanagedCount > 0 && (
        <div role="alert" className="rounded-lg border border-amber-500 bg-amber-50 p-4 text-sm text-ink">
          {unmanagedCount} {unmanagedCount === 1 ? 'product is' : 'products are'} not in a category from your list, so {unmanagedCount === 1 ? 'it is' : 'they are'} hidden from the website. Edit {unmanagedCount === 1 ? 'it' : 'each one'} and choose a category.
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">Inventory</h2>
          <p className="mt-1 text-sm text-neutral-600">{products.length} {products.length === 1 ? 'product' : 'products'} across {groupSlugs.length} categories</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setManagingCategories(true)} className={`${buttonOutline} inline-flex items-center gap-2 px-4 py-2.5`}>
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Manage categories
          </button>
          <button type="button" onClick={() => setDialog({ mode: 'create', category: groupSlugs[0] ?? '' })} className={`${buttonPrimary} inline-flex items-center gap-2 px-4 py-2.5`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add product
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
          <button type="button" onClick={() => setCategoryFilter('all')} className={chipClass(categoryFilter === 'all')}>
            All categories ({products.length})
          </button>
          {groupSlugs.map((slug) => (
            <button key={slug} type="button" onClick={() => setCategoryFilter(slug)} className={chipClass(categoryFilter === slug)}>
              {labelFor(slug)} ({products.filter((product) => product.category === slug).length})
            </button>
          ))}
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by placement">
          {FLAG_FILTERS.map((option) => (
            <button key={option.id} type="button" onClick={() => setFlag(option.id)} className={chipClass(flag === option.id)}>
              {option.label} ({products.filter((product) => matchesFlag(product, option.id)).length})
            </button>
          ))}
        </div>
      </div>

      {positionsError && (
        <p role="alert" className="text-sm text-crimson-400">{positionsError}</p>
      )}

      {positions === null && !positionsError ? (
        <p className="text-sm text-neutral-600" aria-busy="true">Loading product order...</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.slug} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => toggle(group.slug)}
                  aria-expanded={isOpen(group.slug)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-ink"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen(group.slug) ? '' : '-rotate-90'}`} aria-hidden="true" />
                  {group.label}
                  <span className="font-normal text-neutral-500">({group.items.length})</span>
                </button>
                {group.managed && (
                  <button
                    type="button"
                    onClick={() => setDialog({ mode: 'create', category: group.slug })}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-neutral-200"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add to {group.label}
                  </button>
                )}
              </header>

              {isOpen(group.slug) && (
                group.items.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-neutral-500 sm:px-5">
                    {flag === 'all' ? 'No products in this category yet.' : 'No products match this filter here.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-neutral-200">
                    {group.items.map((product) => (
                      <InventoryRow
                        key={product.slug}
                        product={product}
                        categoryLabel={group.label}
                        position={positionOf(product.slug)}
                        onEdit={() => setDialog({ mode: 'edit', product })}
                        onPositionSaved={(slug, next) => setPositions((current) => ({ ...(current ?? {}), [slug]: next }))}
                        onDeleted={onProductDeleted}
                      />
                    ))}
                  </ul>
                )
              )}
            </section>
          ))}
        </div>
      )}

      {dialog !== null && (
        <ProductDialog
          product={dialog.mode === 'edit' ? dialog.product : null}
          initialCategory={dialog.mode === 'create' ? dialog.category : dialog.product.category}
          initialPosition={dialog.mode === 'edit' ? positionOf(dialog.product.slug) : nextPositionIn(dialog.category)}
          initialStock={dialog.mode === 'edit' ? dialog.product.stock : 0}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}
      {managingCategories && (
        <CategoryManagerDialog
          categories={categories}
          products={products}
          onClose={() => setManagingCategories(false)}
          onCatalogChanged={onCatalogChanged}
        />
      )}
    </div>
  );
}
