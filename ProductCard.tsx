import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '@/context/useStore';
import { formatUSD } from '@/lib/format';
import { getDiscountPercent, isOnSale, type Product } from '@/lib/catalog';
import { productRating, productReviewCount } from '@/lib/productMeta';
import { Stars } from '@/components/ui/Stars';

type ProductCardProps = {
  product: Product;
  variant?: 'catalog' | 'home';
};

export function ProductCard({ product, variant = 'catalog' }: ProductCardProps) {
  const { addToCart, isInWishlist, toggleWishlist } = useStore();
  const saved = isInWishlist(product.slug);
  const onSale = isOnSale(product);
  const image = product.images[0];
  const isHomeCard = variant === 'home';
  const rating = productRating(product.slug);
  const reviewCount = productReviewCount(product.slug);

  const handleAddToCart = () => {
    addToCart({ slug: product.slug, size: product.sizes[0] ?? '', color: product.colors[0] ?? '', quantity: 1 });
  };

  return (
    <article className={isHomeCard ? 'group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg' : 'group relative flex min-w-0 flex-col'}>
      <div className={`relative overflow-hidden bg-neutral-100 ${isHomeCard ? 'aspect-square rounded-t-xl bg-white' : 'rounded-xl'}`}>
        <Link to={`/product/${product.slug}`} className="block" aria-label={`View ${product.name}`}>
          {image && (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className={`w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105 ${isHomeCard ? 'h-full p-4' : 'h-auto'}`}
            />
          )}
        </Link>
        {(product.is_new || product.is_best_seller) && (
          <span className={`absolute ${isHomeCard ? 'left-2.5 top-2.5 rounded-md bg-lime-500 px-2 py-1 text-[10px] text-white' : 'left-3 top-3 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[8px] text-white'} font-semibold uppercase leading-none tracking-wide`}>
            {product.is_new ? 'New' : 'Best Seller'}
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleWishlist(product.slug)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={`absolute flex items-center justify-center bg-white/95 text-neutral-800 shadow-sm transition-transform hover:scale-105 ${isHomeCard ? 'right-2.5 top-2.5 h-9 w-9 rounded-full shadow' : 'right-2.5 top-2.5 h-9 w-9 rounded-full'}`}
        >
          <Heart className={`${isHomeCard ? 'h-4 w-4' : 'h-4 w-4'} ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </div>

      {isHomeCard ? (
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <Link to={`/product/${product.slug}`} className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-snug text-ink hover:text-lime-600 sm:min-h-[44px] sm:text-base">
            {product.name}
          </Link>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars rating={Math.round(rating)} iconClassName="h-3.5 w-3.5" />
            <span className="text-xs font-semibold text-neutral-700">{rating.toFixed(1)}</span>
            <span className="text-xs text-lime-600">({reviewCount.toLocaleString()})</span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl font-extrabold tracking-tight text-ink">{formatUSD(product.price)}</span>
            {onSale && product.compare_at_price && <span className="text-xs text-neutral-400 line-through">{formatUSD(product.compare_at_price)}</span>}
          </div>
          {onSale && <p className="text-xs font-semibold text-emerald-700">Save {getDiscountPercent(product)}%</p>}
          <p className="mt-1 text-[11px] text-neutral-500">Free shipping over $50</p>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-lime-500 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-lime-600 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:text-sm"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-1 flex-col">
          <h3 className="text-sm font-bold leading-snug text-neutral-900">
            <Link to={`/product/${product.slug}`} className="hover:underline underline-offset-4">{product.name}</Link>
          </h3>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold text-neutral-900">{formatUSD(product.price)}</span>
            {onSale && product.compare_at_price && <span className="text-xs text-neutral-400 line-through">{formatUSD(product.compare_at_price)}</span>}
          </p>
        </div>
      )}
    </article>
  );
}
