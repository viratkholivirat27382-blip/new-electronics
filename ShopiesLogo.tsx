import { ShoppingBag } from 'lucide-react';

export function ShopiesLogo({ className = 'text-ink' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-sans font-bold leading-none tracking-tight ${className}`} aria-label="Shopies home">
      <ShoppingBag className="h-[0.8em] w-[0.8em] stroke-[2.2]" aria-hidden="true" />
      <span>Shopies</span>
    </span>
  );
}
