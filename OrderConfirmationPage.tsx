import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { buttonOutline, buttonPrimary, eyebrow } from '@/components/ui/styles';
import { formatUSD } from '@/lib/format';
import { fetchDemoOrder, type DemoOrder } from '@/lib/orders';

type LoadResult = { order: DemoOrder | null; error: string | null };

export function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams();
  const location = useLocation();
  const paymentSuccess = Boolean((location.state as { paymentSuccess?: boolean } | null)?.paymentSuccess);

  const [result, setResult] = useState<LoadResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setResult(null);
    fetchDemoOrder(orderNumber)
      .then((order) => {
        if (active) setResult({ order, error: null });
      })
      .catch((err: Error) => {
        if (active) setResult({ order: null, error: err.message });
      });
    return () => {
      active = false;
    };
  }, [orderNumber, attempt]);

  if (result === null) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-4 py-24" aria-busy="true">
        <div className="h-4 w-1/4 bg-neutral-200" />
        <div className="mt-6 h-10 w-2/3 bg-neutral-200" />
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <div role="alert" className="border border-crimson-600 bg-crimson-700/10 p-6">
          <p className="text-sm">{result.error}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={`${buttonOutline} mt-4`}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const order = result.order;
  if (!order) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className={eyebrow}>Order</p>
        <h1 className="mt-4 font-heading text-4xl font-bold">We could not find that order</h1>
        <p className="mt-4 text-sm text-neutral-600">Check the order number in your confirmation and try again.</p>
        <Link to="/shop" className={`${buttonPrimary} mt-8`}>Continue shopping</Link>
      </section>
    );
  }

  const address = order.shipping_address;
  const isCod = order.shipping_method === 'cod';
  const isBankTransfer = order.payment_method === 'bank_transfer';
  const bankTransferPending = order.payment_status === 'bank_transfer_pending';
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-12 lg:px-8 lg:pt-16">
      {bankTransferPending ? (
        <div role="status" className="mb-10 border border-amber-500 bg-amber-50 px-5 py-4 text-sm text-ink">
          Payment proof received. Your order is pending until an admin approves the transfer.
        </div>
      ) : paymentSuccess || isBankTransfer ? (
        <div role="status" className="mb-10 flex items-center gap-3 border border-emerald-600 bg-emerald-700/10 px-5 py-4 text-sm text-ink">
          Payment successful. Your order is confirmed.
        </div>
      ) : null}
      <p className={eyebrow}>{bankTransferPending ? 'Payment under review' : 'Order confirmed'}</p>
      <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">Thank you, {address.first_name}</h1>
      <p className="mt-4 text-sm text-neutral-600">
        Order <span className="text-ink">{order.order_number}</span>. A confirmation will be sent to {order.contact.email}.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_340px] lg:gap-16">
        <section aria-label="Items in this order">
          <ul className="border-t border-neutral-200">
            {order.items.map((item) => (
              <li key={`${item.slug}-${item.size}-${item.color}`} className="flex gap-4 border-b border-neutral-200 py-6">
                <div className="aspect-[3/4] w-20 flex-none overflow-hidden bg-neutral-100">
                  {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-1 items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-lg font-semibold leading-tight">{item.name}</h2>
                    <p className="mt-2 text-xs uppercase tracking-luxe text-neutral-500">
                      {[item.color, item.size].filter(Boolean).join(' / ')} / Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm">{formatUSD(item.line_total)}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-neutral-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </section>

        <aside className="h-fit space-y-8 border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
          <section>
            <p className={eyebrow}>Payment</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Subtotal</dt>
                <dd>{formatUSD(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt>
                  <dd>-{formatUSD(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Shipping</dt>
                <dd>{order.shipping_fee === 0 ? 'Free' : formatUSD(order.shipping_fee)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-neutral-200 pt-4">
                <dt className="text-ink">{isBankTransfer ? 'Amount submitted' : isCod ? 'Paid today' : 'Total paid'}</dt>
                <dd className="font-heading text-2xl font-bold">{formatUSD(order.total_due_now)}</dd>
              </div>
              {isCod && (
                <div className="flex justify-between gap-4 text-neutral-600">
                  <dt>Due on delivery</dt>
                  <dd>{formatUSD(order.cod_balance)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section>
            <p className={eyebrow}>Shipping to</p>
            <address className="mt-4 text-sm not-italic leading-relaxed text-neutral-600">
              {address.first_name} {address.last_name}
              <br />
              {address.street}
              {address.apartment && <><br />{address.apartment}</>}
              <br />
              {address.city}, {address.state} {address.zip}
            </address>
          </section>

          <p className="text-xs leading-relaxed text-neutral-500">
            {isBankTransfer ? 'Your transfer will be checked before the order is confirmed.' : 'This was a demonstration order. No real payment was taken.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
