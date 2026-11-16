import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteProduct, type AdminProduct } from '@/lib/admin';
import { setProductPosition } from '@/lib/productPositions';
import { formatUSD } from '@/lib/format';
import { buttonOutline } from '@/components/ui/styles';

type InventoryRowProps = {
  product: AdminProduct;
  categoryLabel: string;
  position: number;
  onEdit: () => void;
  onPositionSaved: (slug: string, position: number) => void;
  onDeleted: (slug: string) => void;
};

const BADGE_BASE = 'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

export function InventoryRow({ product, categoryLabel, position, onEdit, onPositionSaved, onDeleted }: InventoryRowProps) {
  const [positionText, setPositionText] = useState(String(position));
  const [savingPosition, setSavingPosition] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPositionText(String(position));
  }, [position]);

  const onSale = product.compare_at_price !== null && product.compare_at_price > product.price;
  const busy = savingPosition || deleting;

  const savePosition = async () => {
    const next = Number(positionText);
    if (!Number.isInteger(next) || next < 1) {
      setPositionText(String(position));
      setError('Position must be a whole number, 1 or more.');
      return;
    }
    if (next === position) return;
    setSavingPosition(true);
    setError(null);
    try {
      await setProductPosition(product.slug, next);
      onPositionSaved(product.slug, next);
    } catch (err) {
      setPositionText(String(position));
      setError(err instanceof Error ? err.message : 'Position could not be saved.');
    } finally {
      setSavingPosition(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${product.name}" permanently? It will disappear from the website.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(product.slug);
      onDeleted(product.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product could not be deleted.');
      setDeleting(false);
    }
  };

  return (
    <li className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center md:gap-5">
      <div className="flex min-w-0 items-center gap-4">
        {product.images[0] ? (
          <img src={product.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-md border border-neutral-200 bg-neutral-100 object-contain" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-400">No photo</div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">{product.sku || 'No SKU'}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.is_best_seller && <span className={`${BADGE_BASE} bg-neutral-900 text-white`}>Best seller</span>}
            {product.is_featured && <span className={`${BADGE_BASE} bg-sky-100 text-sky-800`}>Featured</span>}
            {product.is_new && <span className={`${BADGE_BASE} bg-lime-200 text-lime-900`}>New</span>}
            {onSale && <span className={`${BADGE_BASE} bg-amber-100 text-amber-900`}>On sale</span>}
            {product.status !== 'active' && <span className={`${BADGE_BASE} bg-neutral-200 text-neutral-700`}>{product.status}</span>}
          </div>
        </div>
      </div>

      <div className="min-w-0 text-sm text-neutral-700">
        <p className="truncate">{categoryLabel}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">{product.subcategory || 'No subcategory'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-700">
        <p>
          <span className="font-medium text-ink">{formatUSD(product.price)}</span>
          {onSale && product.compare_at_price !== null && (
            <span className="ml-2 text-xs text-neutral-400 line-through">{formatUSD(product.compare_at_price)}</span>
          )}
        </p>
        <p className={product.stock > 0 ? 'text-neutral-700' : 'font-medium text-crimson-500'}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="whitespace-nowrap">Position</span>
          <input
            inputMode="numeric"
            value={positionText}
            disabled={busy}
            onChange={(e) => setPositionText(e.target.value)}
            onBlur={savePosition}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            aria-label={`Position of ${product.name} in ${categoryLabel}`}
            className="w-16 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-center text-sm text-ink focus:border-ink focus:outline-none disabled:opacity-60"
          />
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit} disabled={busy} className={`${buttonOutline} inline-flex items-center gap-1.5 px-3 py-2 text-xs`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-crimson-500/10 hover:text-crimson-500 disabled:opacity-50"
            aria-label={`Delete ${product.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-xs text-crimson-400 md:col-span-4">{error}</p>}
    </li>
  );
}
