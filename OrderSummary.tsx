import { useState } from 'react';
import { buttonAccent, buttonOutline, eyebrow, inputBase } from '@/components/ui/styles';
import { formatUSD } from '@/lib/format';
import type { OrderQuote, PaymentMethod, ShippingMethod } from '@/lib/orders';

type OrderSummaryProps = {
  quote: OrderQuote | null;
  quoteError: string | null;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  appliedCoupon: string;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  submitError: string | null;
  submitting: boolean;
};

export function OrderSummary({
  quote,
  quoteError,
  shippingMethod,
  paymentMethod,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  submitError,
  submitting,
}: OrderSummaryProps) {
  const [couponInput, setCouponInput] = useState('');
  const canSubmit = quote !== null && quoteError === null;
  const itemCount = quote?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    onApplyCoupon(code);
    setCouponInput('');
  };

  return (
    <aside className="h-fit border border-neutral-200 bg-neutral-100 p-6 lg:sticky lg:top-28 sm:p-8">
      <p className={eyebrow}>Order summary</p>
      {itemCount > 0 && (
        <p className="mt-3 text-sm text-neutral-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
      )}

      <div className="mt-6 space-y-3">
        <label htmlFor="coupon-code" className="sr-only">Discount code</label>
        <div className="flex gap-3">
          <input
            id="coupon-code"
            value={couponInput}
            onChange={(event) => setCouponInput(event.target.value)}
            placeholder="Discount code"
            autoComplete="off"
            className={inputBase}
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={!couponInput.trim()}
            className={`${buttonOutline} px-5`}
          >
            Apply
          </button>
        </div>
        {appliedCoupon && (
          <div className="flex items-center justify-between text-xs uppercase tracking-luxe text-neutral-600">
            <span>Code {appliedCoupon}</span>
            <button type="button" onClick={onRemoveCoupon} className="underline underline-offset-4 hover:text-ink">
              Remove
            </button>
          </div>
        )}
      </div>

      {quoteError && (
        <p role="alert" className="mt-6 border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{quoteError}</p>
      )}

      {!quote && !quoteError && (
        <p role="status" className="mt-6 animate-pulse text-sm text-neutral-500">Calculating your total...</p>
      )}

      {quote && (
        <dl className="mt-6 space-y-3 border-t border-neutral-200 pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-600">Subtotal</dt>
            <dd>{formatUSD(quote.subtotal)}</dd>
          </div>
          {quote.discount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-600">Discount</dt>
              <dd>-{formatUSD(quote.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-600">Shipping</dt>
            <dd>{quote.shipping_fee === 0 ? 'Free' : formatUSD(quote.shipping_fee)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-neutral-200 pt-4">
            <dt className="text-ink">{shippingMethod === 'cod' ? 'Due today' : paymentMethod === 'bank_transfer' ? 'Amount to transfer' : 'Total due today'}</dt>
            <dd className="font-serif text-2xl">{formatUSD(quote.total_due_now)}</dd>
          </div>
          {shippingMethod === 'cod' && (
            <div className="flex justify-between gap-4 text-neutral-600">
              <dt>Due on delivery</dt>
              <dd>{formatUSD(quote.cod_balance)}</dd>
            </div>
          )}
        </dl>
      )}

      {submitError && (
        <p role="alert" className="mt-6 border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{submitError}</p>
      )}

      <button
        type="submit"
        form="checkout-form"
        disabled={!canSubmit || submitting}
        className={`${buttonAccent} mt-8 w-full`}
      >
        {submitting ? 'Processing payment...' : paymentMethod === 'bank_transfer' ? 'Submit payment proof' : 'Pay now'}
      </button>

      <p className="mt-6 text-xs leading-relaxed text-neutral-500">
        {paymentMethod === 'bank_transfer'
          ? 'Your payment proof will be reviewed before the order is confirmed.'
          : 'Payments are simulated for this store. Card details are checked on this device and are never sent or stored.'}
      </p>
    </aside>
  );
}

export function MobilePayBar({ quote, quoteError, paymentMethod, submitting }: {
  quote: OrderQuote | null;
  quoteError: string | null;
  paymentMethod: PaymentMethod;
  submitting: boolean;
}) {
  const canSubmit = quote !== null && quoteError === null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <button
        type="submit"
        form="checkout-form"
        disabled={!canSubmit || submitting}
        className={`${buttonAccent} w-full`}
      >
        {submitting ? 'Processing...' : paymentMethod === 'bank_transfer' ? 'Submit payment proof' : quote ? `Pay ${formatUSD(quote.total_due_now)}` : 'Pay now'}
      </button>
    </div>
  );
}
