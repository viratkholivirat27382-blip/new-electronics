import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { EmptyBag } from '@/components/cart/EmptyBag';
import { buttonAccent, buttonOutline, buttonPrimary, eyebrow } from '@/components/ui/styles';
import { lineKey } from '@/context/StoreContext';
import { useStore } from '@/context/useStore';
import { formatUSD } from '@/lib/format';
import { quoteOrder, type OrderQuote } from '@/lib/orders';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, setCartQuantity, removeFromCart, moveCartItemToWishlist, clearCart } = useStore();
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cart.length === 0) return;
    let active = true;
    quoteOrder({ items: cart, coupon_code: '', shipping_method: 'advance', payment_brand: '' })
      .then((data) => {
        if (!active) return;
        setQuote(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (!active) return;
        setQuote(null);
        setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [cart, attempt]);

  if (cart.length === 0) return <EmptyBag />;

  const canCheckout = quote !== null && error === null;
  const isStaleError = error !== null && /no longer available|sold out|not a valid|select a valid/i.test(error);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-6 lg:px-8 lg:pt-10">
      <p className={eyebrow}>Your bag</p>
      <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">Shopping cart</h1>

      {error && (
        <div role="alert" className="mt-8 border border-crimson-600 bg-crimson-700/10 p-6">
          <p className="text-sm">{error}</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className={`${buttonOutline}`}>
              Try again
            </button>
            {isStaleError && (
              <button type="button" onClick={() => clearCart()} className={`${buttonPrimary}`}>
                Clear cart
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
        <section aria-label="Items in your bag">
          {!quote && !error && (
            <p role="status" className="animate-pulse py-10 text-sm text-neutral-500">Updating your bag...</p>
          )}
          {quote && (
            <ul className="border-t border-neutral-200">
              {quote.lines.map((line) => {
                const key = lineKey(line);
                return (
                  <CartLineItem
                    key={key}
                    line={line}
                    onQuantityChange={(quantity) => setCartQuantity(key, quantity)}
                    onRemove={() => removeFromCart(key)}
                    onSaveForLater={() => moveCartItemToWishlist(key)}
                  />
                );
              })}
            </ul>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-neutral-200 bg-neutral-50 p-6 lg:sticky lg:top-28">
          <p className={eyebrow}>Summary</p>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd>{quote ? formatUSD(quote.subtotal) : '...'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-600">Shipping</dt>
              <dd className="text-right text-neutral-600">Calculated at checkout</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            disabled={!canCheckout}
            className={`${buttonAccent} mt-8 w-full py-4 text-sm normal-case tracking-normal`}
          >
            Checkout
          </button>
          <button type="button" onClick={() => navigate('/shop')} className={`${buttonOutline} mt-3 w-full`}>
            Continue shopping
          </button>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs uppercase tracking-luxe text-neutral-600">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Secure checkout
          </p>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[3.75rem] z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          disabled={!canCheckout}
          className={`${buttonAccent} w-full`}
        >
          {quote ? `Checkout ${formatUSD(quote.total_due_now)}` : 'Checkout'}
        </button>
      </div>
    </div>
  );
}
