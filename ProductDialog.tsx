import { useState } from 'react';
import { X } from 'lucide-react';
import { ProductFormFields } from '@/components/admin/ProductFormFields';
import { buttonOutline, buttonPrimary } from '@/components/ui/styles';
import { createProduct, emptyProductDraft, setProductStock, updateProduct, validateProductDraft, type AdminProduct, type ProductDraft } from '@/lib/admin';
import { setProductPosition } from '@/lib/productPositions';

type ProductDialogProps = {
  product: AdminProduct | null;
  initialCategory: string;
  initialPosition: number;
  initialStock: number;
  onClose: () => void;
  onSaved: (product: AdminProduct, position: number) => void;
};

function toDraft(product: AdminProduct): ProductDraft {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    compare_at_price: product.compare_at_price,
    subcategory: product.subcategory,
    audience: product.audience,
    short_description: product.short_description,
    description: product.description,
    sku: product.sku,
    sizes: product.sizes,
    colors: product.colors,
    images: product.images,
    is_new: product.is_new,
    is_featured: product.is_featured,
    is_best_seller: product.is_best_seller,
    status: product.status,
  };
}

export function ProductDialog({ product, initialCategory, initialPosition, initialStock, onClose, onSaved }: ProductDialogProps) {
  const initialDraft = product ? toDraft(product) : emptyProductDraft(initialCategory);
  const [draft, setDraft] = useState<ProductDraft>(initialDraft);
  const [stock, setStock] = useState(String(initialStock));
  const [position, setPosition] = useState(String(initialPosition));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = product === null;
  const hasChanges =
    JSON.stringify(draft) !== JSON.stringify(initialDraft) ||
    stock !== String(initialStock) ||
    position !== String(initialPosition);

  const requestClose = () => {
    if (saving) return;
    if (hasChanges && !window.confirm('Discard your changes?')) return;
    onClose();
  };

  const save = async () => {
    const validationError = validateProductDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const stockCount = Number(stock);
    if (!Number.isInteger(stockCount) || stockCount < 0) {
      setError('Stock must be a whole number, 0 or more.');
      return;
    }
    const positionNumber = Number(position);
    if (!Number.isInteger(positionNumber) || positionNumber < 1) {
      setError('Position must be a whole number, 1 or more.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const cleanDraft: ProductDraft = { ...draft, images: draft.images.map((url) => url.trim()).filter(Boolean) };
      let saved: AdminProduct;
      if (product) {
        await updateProduct(cleanDraft);
        await setProductStock(product.slug, stockCount);
        saved = { ...product, ...cleanDraft, stock: stockCount };
      } else {
        const slug = await createProduct(cleanDraft, stockCount);
        saved = { ...cleanDraft, slug, stock: stockCount };
      }
      await setProductPosition(saved.slug, positionNumber);
      onSaved(saved, positionNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product could not be saved.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-8 sm:py-5">
          <div>
            <h2 id="product-dialog-title" className="font-serif text-2xl text-ink">{isNew ? 'Add product' : 'Edit product'}</h2>
            <p className="mt-1 text-sm text-neutral-600">{isNew ? 'Fill in the details. You can change anything later.' : product.name}</p>
          </div>
          <button type="button" onClick={requestClose} className="rounded p-1 text-neutral-500 transition-colors hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <ProductFormFields
            draft={draft}
            onChange={setDraft}
            onError={setError}
            stock={stock}
            onStockChange={setStock}
            position={position}
            onPositionChange={setPosition}
          />
          {error && <p role="alert" className="mt-6 border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={requestClose} disabled={saving} className={`${buttonOutline} w-full px-4 py-2.5 sm:w-auto`}>Cancel</button>
          <button type="button" onClick={save} disabled={saving} className={`${buttonPrimary} w-full px-4 py-2.5 sm:w-auto`}>
            {saving ? 'Saving...' : isNew ? 'Add product' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
