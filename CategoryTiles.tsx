import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '@/lib/catalog';
import { useCategories } from '@/context/useCategories';
import { categoryVisual } from '@/lib/categoryVisuals';

export function CategoryTiles({ products }: { products: Product[] | null }) {
  const { categories } = useCategories();
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 lg:gap-3">
      {(categories ?? []).map((category, index) => {
        const cover = categoryVisual(category, products);
        return (
          <Link
            key={category.slug}
            to={`/category/${category.slug}`}
            style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'both' }}
            className="group animate-fade-in rounded-2xl bg-neutral-100 p-2.5 transition-all duration-300 hover:-translate-y-1 hover:bg-neutral-200 hover:shadow-md sm:p-3"
          >
            <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-200">
              {cover && (
                <img
                  src={cover}
                  alt={`${category.label} category`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-colors group-hover:bg-lime-400" aria-hidden="true">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-tight text-ink sm:text-base">{category.label}</h3>
          </Link>
        );
      })}
    </div>
  );
}
