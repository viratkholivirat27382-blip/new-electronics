import { Heart, Minus, Plus, X } from 'lucide-react';
import { MAX_LINE_QUANTITY } from '@/context/StoreContext';
import { formatUSD } from '@/lib/format';
import type { OrderLine } from '@/lib/orders';

type CartLineItemProps = {
  line: OrderLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onSaveForLater: () => void;
};

export function CartLineItem({ line, onQuantityChange, onRemove, onSaveForLater }: CartLineItemProps) {
  const details = [line.color, line.size].filter(Boolean).join(' / ');

  return (
    <li className="flex gap-4 border-b border-neutral-200 py-6 sm:gap-6">
      <div className="aspect-square w-24 flex-none overflow-hidden rounded-xl bg-neutral-100 sm:w-32">
        {line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight">{line.name}</h3>
            {details && <p className="mt-2 text-xs uppercase tracking-luxe text-neutral-600">{details}</p>}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-neutral-600 transition-colors hover:text-ink"
            aria-label={`Remove ${line.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
          <div className="flex items-center border border-neutral-300">
            <button
              type="button"
              onClick={() => onQuantityChange(line.quantity - 1)}
              disabled={line.quantity <= 1}
              className="flex h-10 w-10 items-center justify-center text-ink disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm" aria-live="polite">{line.quantity}</span>
            <button
              type="button"
              onClick={() => onQuantityChange(line.quantity + 1)}
              disabled={line.quantity >= MAX_LINE_QUANTITY}
              className="flex h-10 w-10 items-center justify-center text-ink disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm text-ink">{formatUSD(line.line_total)}</p>
            {line.quantity > 1 && <p className="mt-1 text-xs text-neutral-500">{formatUSD(line.unit_price)} each</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={onSaveForLater}
          className="mt-4 flex items-center gap-2 self-start text-xs uppercase tracking-luxe text-neutral-700 transition-colors hover:text-ink"
        >
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          Save for later
        </button>
      </div>
    </li>
  );
}
