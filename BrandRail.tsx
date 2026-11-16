import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '@/lib/catalog';
import { formatUSD } from '@/lib/format';
import { isOnSale } from '@/lib/catalog';

const BRANDS = ['Kinetic', 'Northbound', 'Form & Co', 'Lumière', 'Atelier Nine', 'Hearth', 'Ironpeak', 'Stride', 'Terro', 'Vantage', 'Aether', 'Airis'];

export function BrandRail() {
  return (
    <div className="border-y border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Brands we stock</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {BRANDS.map((brand) => (
            <span key={brand} className="text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-900">
              {brand}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
