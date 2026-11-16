import { HomeHero } from '@/components/home/HomeHero';
import { NewsletterSignup } from '@/components/home/NewsletterSignup';
import { ProductRail } from '@/components/home/ProductRail';
import { TrustStrip } from '@/components/home/TrustStrip';
import { useActiveProducts } from '@/lib/useActiveProducts';

const CONTAINER = 'mx-auto max-w-7xl px-3 sm:px-4 lg:px-8';

export function HomePage() {
  const { products, error, retry } = useActiveProducts();
  const heroProduct = products?.find((p) => p.is_featured) ?? products?.[0] ?? null;

  return (
    <div>
      <HomeHero product={heroProduct} />
      <TrustStrip />

      {error && (
        <div className={`${CONTAINER} pt-6`}>
          <div role="alert" className="rounded-xl border border-crimson-600 bg-crimson-700/10 p-5">
            <p className="text-sm">{error}</p>
            <button type="button" onClick={retry} className="mt-3 rounded-full bg-lime-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white">Try again</button>
          </div>
        </div>
      )}

      <section className={`${CONTAINER} py-7 lg:py-10`} aria-labelledby="electronics-heading">
        <div className="mb-4 flex items-end justify-between gap-4 lg:mb-6">
          <div>
            <h2 id="electronics-heading" className="font-heading text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">Electronics</h2>
            <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm">Top picks in audio, speakers and accessories</p>
          </div>
        </div>
        <ProductRail products={products} emptyText="Our electronics will appear here soon." />
      </section>

      <NewsletterSignup />
    </div>
  );
}
