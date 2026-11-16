import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '@/lib/catalog';

export function HomeHero({ product }: { product?: Product | null }) {
  const image = product?.images[0];
  return (
    <section className="bg-gradient-to-br from-ink via-[#123a6f] to-lime-500 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-[1.15fr_1fr] items-center gap-3 px-4 py-7 sm:gap-8 sm:py-10 lg:px-8 lg:py-14">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200 sm:text-xs">Best sellers in tech</p>
          <h1 className="mt-2 font-heading text-[26px] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Smart tech for everyday life
          </h1>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-white/80 sm:text-base">
            Headphones, speakers and accessories. Free shipping on orders over $50.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
            <Link to="/shop" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-lg transition-transform hover:scale-105 sm:px-7 sm:py-3.5 sm:text-sm">
              Shop now <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/best-sellers" className="inline-flex items-center rounded-full border border-white/50 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 sm:px-7 sm:py-3.5 sm:text-sm">
              Best sellers
            </Link>
          </div>
        </div>

        {image && product ? (
          <Link to={`/product/${product.slug}`} aria-label={`View ${product.name}`} className="relative mx-auto block aspect-square w-full max-w-[420px]">
            <span className="absolute inset-[6%] rounded-full bg-white/15" aria-hidden="true" />
            <img src={image} alt={product.name} fetchPriority="high" className="relative h-full w-full rounded-3xl object-cover shadow-2xl" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
