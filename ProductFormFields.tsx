import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useState } from 'react';
import { ProductImageEditor } from '@/components/admin/ProductImageEditor';
import { inputBase, labelBase } from '@/components/ui/styles';
import { useCategories } from '@/context/useCategories';
import type { ProductDraft } from '@/lib/admin';

const AUDIENCES = ['all', 'men', 'women', 'girls', 'boys'] as const;
const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const STATUSES = ['active', 'draft', 'archived'] as const;

type ProductFormFieldsProps = {
  draft: ProductDraft;
  onChange: Dispatch<SetStateAction<ProductDraft>>;
  onError: (message: string | null) => void;
  stock: string;
  onStockChange: (value: string) => void;
  position: string;
  onPositionChange: (value: string) => void;
};

function parseList(text: string) {
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}

function CommaListInput({ values, onChange, placeholder, ariaLabel }: { values: string[]; onChange: (values: string[]) => void; placeholder: string; ariaLabel: string }) {
  const [text, setText] = useState(values.join(', '));
  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseList(e.target.value));
      }}
      className={inputBase}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-neutral-200 pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-luxe text-neutral-600">{title}</h3>
      {children}
    </section>
  );
}

export function ProductFormFields({ draft, onChange, onError, stock, onStockChange, position, onPositionChange }: ProductFormFieldsProps) {
  const { categories } = useCategories();
  const categoryList = categories ?? [];
  const selectedCategory = categoryList.find((category) => category.slug === draft.category) ?? null;
  const onSale = draft.compare_at_price !== null && draft.compare_at_price > draft.price;

  const patch = (changes: Partial<ProductDraft>) => onChange((current) => ({ ...current, ...changes }));

  return (
    <div className="space-y-6">
      <FormSection title="Basics">
        <div>
          <label htmlFor="product-name" className={labelBase}>Product title</label>
          <input id="product-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} className={inputBase} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="product-category" className={labelBase}>Category</label>
            <select id="product-category" value={draft.category} onChange={(e) => patch({ category: e.target.value, subcategory: '' })} className={inputBase}>
              <option value="">Choose a category</option>
              {draft.category && !selectedCategory && <option value={draft.category}>{draft.category} (not in list)</option>}
              {categoryList.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="product-subcategory" className={labelBase}>Subcategory</label>
            <select id="product-subcategory" value={draft.subcategory} onChange={(e) => patch({ subcategory: e.target.value })} className={inputBase} disabled={!selectedCategory}>
              <option value="">No subcategory</option>
              {selectedCategory?.subcategories.map((sub) => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
            </select>
          </div>
        </div>
        <div className="max-w-xs">
          <label htmlFor="product-position" className={labelBase}>Position in category</label>
          <input id="product-position" inputMode="numeric" value={position} onChange={(e) => onPositionChange(e.target.value)} className={inputBase} />
          <p className="mt-1.5 text-xs text-neutral-500">1 shows first in this category. Products with the same number are sorted newest first.</p>
        </div>
      </FormSection>

      <FormSection title="Price and stock">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="product-price" className={labelBase}>Price ($)</label>
            <input id="product-price" inputMode="decimal" value={String(draft.price)} onChange={(e) => patch({ price: Number(e.target.value) })} className={inputBase} />
          </div>
          <div>
            <label htmlFor="product-compare" className={labelBase}>Original price ($)</label>
            <input id="product-compare" inputMode="decimal" value={draft.compare_at_price === null ? '' : String(draft.compare_at_price)} onChange={(e) => patch({ compare_at_price: e.target.value.trim() ? Number(e.target.value) : null })} className={inputBase} placeholder="Optional" />
          </div>
          <div>
            <label htmlFor="product-stock" className={labelBase}>Stock</label>
            <input id="product-stock" inputMode="numeric" value={stock} onChange={(e) => onStockChange(e.target.value)} className={inputBase} />
          </div>
          <div>
            <label htmlFor="product-status" className={labelBase}>Visibility</label>
            <select id="product-status" value={draft.status} onChange={(e) => patch({ status: e.target.value })} className={inputBase}>
              {STATUSES.map((status) => <option key={status} value={status}>{status === 'active' ? 'Shown on website' : status === 'draft' ? 'Hidden (draft)' : 'Archived'}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          {onSale ? 'This product is on sale because the original price is higher than the price.' : 'Enter an original price above the price to show this product as on sale.'}
        </p>
      </FormSection>

      <FormSection title="Placement">
        <div className="grid gap-2 sm:grid-cols-2">
          <PlacementOption label="New arrivals" checked={draft.is_new} onChange={(is_new) => patch({ is_new })} />
          <PlacementOption label="Featured" checked={draft.is_featured} onChange={(is_featured) => patch({ is_featured })} />
          <PlacementOption label="Best seller" checked={draft.is_best_seller} onChange={(is_best_seller) => patch({ is_best_seller })} />
          <PlacementOption label="On sale" checked={onSale} disabled hint="Set by the original price" />
        </div>
      </FormSection>

      <FormSection title="Details">
        <div>
          <label htmlFor="product-short" className={labelBase}>Short description</label>
          <input id="product-short" value={draft.short_description} onChange={(e) => patch({ short_description: e.target.value })} className={inputBase} />
        </div>
        <div>
          <label htmlFor="product-description" className={labelBase}>Full description</label>
          <textarea id="product-description" value={draft.description} onChange={(e) => patch({ description: e.target.value })} className={`${inputBase} min-h-24 resize-y`} rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="product-audience" className={labelBase}>Audience</label>
            <select id="product-audience" value={draft.audience} onChange={(e) => patch({ audience: e.target.value })} className={inputBase}>
              {AUDIENCES.map((audience) => <option key={audience} value={audience}>{audience}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="product-sku" className={labelBase}>SKU</label>
            <input id="product-sku" value={draft.sku} onChange={(e) => patch({ sku: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Colors</label>
            <CommaListInput values={draft.colors} onChange={(colors) => patch({ colors })} placeholder="Black, White" ariaLabel="Colors" />
          </div>
        </div>
        <div>
          <span className={labelBase}>Sizes</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...STANDARD_SIZES, ...draft.sizes.filter((size) => !STANDARD_SIZES.includes(size))].map((size) => {
              const checked = draft.sizes.includes(size);
              return (
                <label key={size} className={`flex cursor-pointer items-center rounded-md border px-3.5 py-2 text-sm font-medium transition-colors ${checked ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-700 hover:border-ink'}`}>
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => patch({ sizes: checked ? draft.sizes.filter((item) => item !== size) : [...draft.sizes, size] })} />
                  {size}
                </label>
              );
            })}
          </div>
        </div>
      </FormSection>

      <FormSection title="Photos">
        <ProductImageEditor images={draft.images} onImagesChange={(images) => patch({ images })} onError={onError} />
      </FormSection>
    </div>
  );
}

type PlacementOptionProps = {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
};

function PlacementOption({ label, checked, onChange, disabled = false, hint }: PlacementOptionProps) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm transition-colors ${checked ? 'border-ink bg-neutral-50 text-ink' : 'border-neutral-200 text-neutral-700'} ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-neutral-400'}`}>
      <span>
        {label}
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-ink"
      />
    </label>
  );
}
