import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/lib/catalog';

export function ProductRail({ products, emptyText }: { products: Product[] | null; emptyText: string }) {
  if (products === null) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse overflow-hidden rounded-2xl">
            <div className="aspect-square bg-neutral-100" />
            <div className="mt-4 h-3 w-2/3 rounded bg-neutral-200" />
            <div className="mt-2 h-3 w-1/3 rounded bg-neutral-200" />
          </div>
        ))}
      </div>
    );
  }
  if (products.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="home" />
      ))}
    </div>
  );
}
