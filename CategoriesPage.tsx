import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { eyebrow } from '@/components/ui/styles';
import { useCategories } from '@/context/useCategories';
import { categoryVisual } from '@/lib/categoryVisuals';
import { subcategorySlug } from '@/lib/categories';
import { useActiveProducts } from '@/lib/useActiveProducts';

export function CategoriesPage() {
  const navigate = useNavigate();
  const { products, error, retry } = useActiveProducts();
  const { categories, error: categoriesError, reload: reloadCategories } = useCategories();
  const shownError = error ?? categoriesError;
  const retryAll = () => {
    retry();
    reloadCategories();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 lg:px-8">
      <header className="border-b border-neutral-100 pb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 transition-colors hover:border-ink hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <p className={eyebrow}>Browse</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">Shop by category</h1>
        <p className="mt-3 max-w-lg text-sm text-neutral-500">Curated edits — find exactly what you came for, or something better.</p>
      </header>

      {shownError && (
        <div role="alert" className="mt-10 border border-neutral-200 p-6">
          <p className="text-sm">{shownError}</p>
          <button type="button" onClick={retryAll} className="mt-4 border border-ink px-5 py-2.5 text-xs uppercase tracking-wider">
            Try again
          </button>
        </div>
      )}

      <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {(categories ?? []).map((category) => {
          const cover = categoryVisual(category, products);
          return (
            <li key={category.slug} className="flex flex-col">
              <Link to={`/category/${category.slug}`} className="group relative block aspect-square overflow-hidden rounded-2xl bg-neutral-100">
                {cover && (
                  <img
                    src={cover}
                    alt={`${category.label} category`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h2 className="text-xl font-semibold text-white">{category.label}</h2>
                  <p className="mt-2 text-sm text-white/75">{category.description}</p>
                </div>
              </Link>
              <ul className="mt-4 flex flex-wrap gap-2">
                {category.subcategories.map((sub) => (
                  <li key={sub.id}>
                    <Link
                      to={`/category/${category.slug}/${subcategorySlug(sub.name)}`}
                      className="inline-flex rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] uppercase tracking-wider text-neutral-600 transition-colors hover:border-ink hover:text-ink"
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
