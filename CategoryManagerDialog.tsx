import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { CategoryEditor } from '@/components/admin/CategoryEditor';
import { buttonOutline, buttonPrimary } from '@/components/ui/styles';
import { deleteCategory, type AdminProduct } from '@/lib/admin';
import type { CategoryDef } from '@/lib/categories';

type CategoryManagerDialogProps = {
  categories: CategoryDef[];
  products: AdminProduct[];
  onClose: () => void;
  onCatalogChanged: () => void;
};

type ManagerView = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; slug: string };

export function CategoryManagerDialog({ categories, products, onClose, onCatalogChanged }: CategoryManagerDialogProps) {
  const [view, setView] = useState<ManagerView>({ kind: 'list' });
  const [error, setError] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const productCountFor = (slug: string) => products.filter((product) => product.category === slug).length;

  const editingCategory = view.kind === 'edit' ? categories.find((category) => category.slug === view.slug) ?? null : null;
  const showEditor = view.kind === 'create' || editingCategory !== null;

  const removeCategory = async (category: CategoryDef) => {
    if (!window.confirm(`Delete the category "${category.label}" and all its subcategories?`)) return;
    setDeletingSlug(category.slug);
    setError(null);
    try {
      await deleteCategory(category.slug);
      onCatalogChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Category could not be deleted.');
    } finally {
      setDeletingSlug(null);
    }
  };

  const backToList = () => {
    setError(null);
    setView({ kind: 'list' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-manager-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="category-manager-title" className="font-serif text-2xl text-ink">Categories</h2>
            <p className="mt-1 text-sm text-neutral-600">Create, rename and remove the categories and subcategories shoppers see on the website.</p>
          </div>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8">
          {showEditor ? (
            <CategoryEditor
              key={view.kind === 'edit' ? view.slug : 'new'}
              category={editingCategory}
              products={products}
              onBack={backToList}
              onCatalogChanged={onCatalogChanged}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button type="button" onClick={() => setView({ kind: 'create' })} className={`${buttonPrimary} inline-flex items-center gap-2 px-4 py-2`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New category
                </button>
              </div>

              {categories.length === 0 ? (
                <p className="text-sm text-neutral-600">No categories yet.</p>
              ) : (
                <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
                  {categories.map((category) => {
                    const count = productCountFor(category.slug);
                    const deleting = deletingSlug === category.slug;
                    return (
                      <li key={category.slug} className="flex items-center gap-4 py-4">
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded border border-neutral-200 bg-neutral-100">
                          {category.image_url && <img src={category.image_url} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{category.label}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {count} {count === 1 ? 'product' : 'products'} · {category.subcategories.length} {category.subcategories.length === 1 ? 'subcategory' : 'subcategories'}
                          </p>
                        </div>
                        <button type="button" onClick={() => setView({ kind: 'edit', slug: category.slug })} disabled={deleting} className={`${buttonOutline} px-4 py-2`}>
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          disabled={deleting || count > 0}
                          title={count > 0 ? 'Move or delete its products first' : 'Delete category'}
                          aria-label={`Delete ${category.label}`}
                          className="p-2 text-neutral-400 transition-colors hover:text-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {error && <p role="alert" className="mt-6 border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{error}</p>}
      </div>
    </div>
  );
}
