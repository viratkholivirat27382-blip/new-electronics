import { X, SlidersHorizontal } from 'lucide-react';
import { type ReactNode } from 'react';
import { PRICE_RANGES, type CollectionFilters } from '@/lib/catalog';
import { buttonOutline, inputBase, labelBase } from '@/components/ui/styles';

type FilterPanelProps = {
  filters: CollectionFilters;
  availableSizes: string[];
  availableColors: string[];
  activeCount: number;
  onToggleList: (key: 'size' | 'color', value: string) => void;
  onSetValue: (key: 'q' | 'price' | 'stock' | 'sale', value: string) => void;
  onClear: () => void;
  onClose?: () => void;
};

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-neutral-200 pt-6">
      <legend className={labelBase}>{title}</legend>
      {children}
    </fieldset>
  );
}

function ToggleChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-[44px] border px-3 py-2 text-xs transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-700 hover:border-ink hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

export function FilterPanel({
  filters,
  availableSizes,
  availableColors,
  activeCount,
  onToggleList,
  onSetValue,
  onClear,
  onClose,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-luxe text-ink">
          Filters {activeCount > 0 && <span className="text-crimson-400">({activeCount})</span>}
        </h2>
        <div className="flex items-center gap-4">
          {activeCount > 0 && (
            <button type="button" onClick={onClear} className="text-xs text-neutral-600 underline underline-offset-4 hover:text-ink">
              Clear all
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 text-ink" aria-label="Close filters">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="filter-keyword" className={labelBase}>Keyword</label>
        <input
          id="filter-keyword"
          type="search"
          value={filters.query}
          onChange={(event) => onSetValue('q', event.target.value)}
          placeholder="Name, color, material"
          className={inputBase}
        />
      </div>

      {availableSizes.length > 0 && (
        <FilterGroup title="Size">
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <ToggleChip key={size} label={size} active={filters.sizes.includes(size)} onClick={() => onToggleList('size', size)} />
            ))}
          </div>
        </FilterGroup>
      )}

      {availableColors.length > 0 && (
        <FilterGroup title="Color">
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <ToggleChip key={color} label={color} active={filters.colors.includes(color)} onClick={() => onToggleList('color', color)} />
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Price">
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map((range) => (
            <label key={range.value} className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="radio"
                name="price"
                value={range.value}
                checked={filters.priceRange === range.value}
                onChange={() => onSetValue('price', range.value)}
                className="accent-ink"
              />
              {range.label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
            <input
              type="radio"
              name="price"
              value=""
              checked={filters.priceRange === ''}
              onChange={() => onSetValue('price', '')}
              className="accent-ink"
            />
            Any price
          </label>
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(event) => onSetValue('stock', event.target.checked ? '1' : '')}
              className="h-4 w-4 accent-ink"
            />
            In stock only
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={filters.onSaleOnly}
              onChange={(event) => onSetValue('sale', event.target.checked ? '1' : '')}
              className="h-4 w-4 accent-ink"
            />
            On sale
          </label>
        </div>
      </FilterGroup>

    </div>
  );
}

export function FilterDrawerButton({ activeCount, onOpen }: { activeCount: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`${buttonOutline} w-full py-3 lg:hidden`}>
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      Filter{activeCount > 0 ? ` (${activeCount})` : ''}
    </button>
  );
}
