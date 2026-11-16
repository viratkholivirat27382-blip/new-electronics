import { Link } from 'react-router-dom';
import { ProductCard } from '@/components/product/ProductCard';
import { buttonOutline, buttonPrimary, eyebrow } from '@/components/ui/styles';
import type { Product } from '@/lib/catalog';
import { useStore } from '@/context/useStore';
import { useActiveProducts } from '@/lib/useActiveProducts';

export function WishlistPage() {
  const { wishlist } = useStore();
  const { products, error, retry } = useActiveProducts();

  const saved = products
    ? wishlist
        .map((slug) => products.find((product) => product.slug === slug))
        .filter((product): product is Product => Boolean(product))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 lg:px-8">
      <header className="border-b border-neutral-200 pb-8">
        <p className={eyebrow}>Your wishlist</p>
        <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">Saved pieces</h1>
        {wishlist.length > 0 && (
          <p className="mt-3 text-sm text-neutral-500">
            {wishlist.length} {wishlist.length === 1 ? 'piece' : 'pieces'} saved
          </p>
        )}
      </header>

      {wishlist.length === 0 && (
        <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
          <h2 className="font-heading text-3xl font-bold">Nothing saved yet</h2>
          <p className="mt-4 text-sm text-neutral-600">Tap the heart on any piece to keep it here for later.</p>
          <Link to="/shop" className={`${buttonPrimary} mt-10`}>Browse the collection</Link>
        </section>
      )}

      {wishlist.length > 0 && error && (
        <div role="alert" className="mt-10 border border-crimson-600 bg-crimson-700/10 p-6">
          <p className="text-sm">{error}</p>
          <button type="button" onClick={retry} className={`${buttonOutline} mt-4`}>
            Try again
          </button>
        </div>
      )}

      {wishlist.length > 0 && !error && !products && (
        <p role="status" className="mt-10 animate-pulse text-sm text-neutral-500">Loading your saved pieces...</p>
      )}

      {products && wishlist.length > 0 && saved.length === 0 && (
        <p className="mt-10 text-sm text-neutral-600">These saved pieces are no longer available.</p>
      )}

      {saved.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {saved.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
