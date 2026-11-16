import { colorSwatch } from '@/lib/productColors';
import type { Product } from '@/lib/catalog';

type ProductVariantPickerProps = {
  product: Product;
  size: string;
  color: string;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
};

export function ProductVariantPicker({ product, size, color, onSizeChange, onColorChange }: ProductVariantPickerProps) {
  return (
    <div className="flex flex-col gap-4">
      {product.sizes.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink">
            Select size{size && <span className="ml-2 font-normal text-neutral-500">{size}</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size">
            {product.sizes.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={size === option}
                onClick={() => onSizeChange(option)}
                className={`flex h-9 min-w-[40px] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-all duration-200 ${
                  size === option
                    ? 'border-lime-400 bg-lime-400 text-ink shadow-sm'
                    : 'border-neutral-300 bg-white text-ink hover:border-ink'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.colors.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink">
            Select color{color && <span className="ml-2 font-normal text-neutral-500">{color}</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
            {product.colors.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={color === option}
                aria-label={option}
                title={option}
                onClick={() => onColorChange(option)}
                style={{ backgroundColor: colorSwatch(option) }}
                className={`h-7 w-7 rounded-full border border-neutral-300 transition-all duration-200 hover:scale-110 ${
                  color === option ? 'ring-2 ring-ink ring-offset-2' : ''
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
