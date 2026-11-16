import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { buttonPrimary, eyebrow } from '@/components/ui/styles';

export function EmptyBag() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
      <ShoppingBag className="h-10 w-10 text-neutral-500" aria-hidden="true" />
      <p className={`${eyebrow} mt-6`}>Your bag</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Your cart is empty</h1>
      <p className="mt-4 text-sm text-neutral-700">Pieces you add will wait for you here.</p>
      <Link to="/shop" className={`${buttonPrimary} mt-10`}>Continue shopping</Link>
    </section>
  );
}
