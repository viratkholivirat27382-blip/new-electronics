import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Home, Minus, Plus, ShoppingBag, Zap } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductVariantPicker } from '@/components/product/ProductVariantPicker';
import { Stars } from '@/components/ui/Stars';
import { buttonAccent, buttonOutline, buttonPrimary, eyebrow } from '@/components/ui/styles';
import { useCategories } from '@/context/useCategories';
import { useStore } from '@/context/useStore';
import { MAX_LINE_QUANTITY } from '@/context/StoreContext';
import { getDiscountPercent, isOnSale, type Product } from '@/lib/catalog';
import { formatUSD } from '@/lib/format';
import { getCategory, subcategorySlug } from '@/lib/categories';
import { productRating, productReviewCount } from '@/lib/productMeta';
import { useActiveProducts } from '@/lib/useActiveProducts';

const RECENT_KEY = 'veyra-recently-viewed';
const MAX_RECENT = 8;

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
      {products.map((item) => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  );
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInWishlist, toggleWishlist } = useStore();
  const { products, error, retry } = useActiveProducts();
  const { categories } = useCategories();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [validation, setValidation] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const product = useMemo(() => products?.find((item) => item.slug === slug) ?? null, [products, slug]);

  const [recentSlugs, setRecentSlugs] = useState<string[]>(() => readRecent());

  useEffect(() => {
    if (!product) return;
    const next = [product.slug, ...readRecent().filter((item) => item !== product.slug)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setRecentSlugs(next);
    setSize('');
    setColor('');
    setQuantity(1);
    setActiveImage(0);
    setValidation(null);
    setConfirmation(false);
  }, [product]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <div role="alert" className="border border-crimson-600 bg-crimson-700/10 p-6">
          <p className="text-sm">{error}</p>
          <button type="button" onClick={retry} className={`${buttonOutline} mt-4`}>Try again</button>
        </div>
      </div>
    );
  }

  if (products === null) {
    return (
      <div className="mx-auto grid max-w-7xl animate-pulse gap-10 px-4 py-10 lg:grid-cols-2 lg:px-8" aria-busy="true">
        <div className="aspect-[3/4] bg-neutral-100" />
        <div className="space-y-4">
          <div className="h-4 w-1/3 bg-neutral-200" />
          <div className="h-10 w-2/3 bg-neutral-200" />
          <div className="h-4 w-1/4 bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className={eyebrow}>Product</p>
        <h1 className="mt-4 font-heading text-4xl font-bold sm:text-5xl">This piece is no longer available</h1>
        <Link to="/shop" className={`${buttonPrimary} mt-8`}>Continue shopping</Link>
      </section>
    );
  }

  const onSale = isOnSale(product);
  const discountPercent = getDiscountPercent(product);
  const saved = isInWishlist(product.slug);
  const soldOut = product.stock <= 0;
  const maxQuantity = Math.min(MAX_LINE_QUANTITY, product.stock);

  const related = products
    .filter((item) => item.slug !== product.slug && item.category === product.category)
    .slice(0, 4);
  const recent = recentSlugs
    .filter((item) => item !== product.slug)
    .map((item) => products.find((p) => p.slug === item))
    .filter((item): item is Product => Boolean(item))
    .slice(0, 4);

  const validate = () => {
    if (product.sizes.length > 0 && !size) return 'Please select a size to continue.';
    if (product.colors.length > 0 && !color) return 'Please select a color to continue.';
    return null;
  };

  const handleAddToCart = () => {
    const problem = validate();
    setValidation(problem);
    setConfirmation(false);
    if (problem) return;
    addToCart({ slug: product.slug, size, color, quantity });
    setConfirmation(true);
  };

  const handleBuyNow = () => {
    const problem = validate();
    setValidation(problem);
    if (problem) return;
    addToCart({ slug: product.slug, size, color, quantity });
    navigate('/checkout');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-6 lg:px-8 lg:pb-20 lg:pt-8">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <Link to="/" aria-label="Home" className="inline-flex text-neutral-600 hover:text-ink">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        <Link to={`/category/${product.category}`} className="hover:text-ink">
          {getCategory(categories ?? [], product.category)?.label ?? product.category}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        <Link to={`/category/${product.category}/${subcategorySlug(product.subcategory)}`} className="hover:text-ink">
          {product.subcategory}
        </Link>
        <ChevronRight className="hidden h-3.5 w-3.5 text-neutral-400 sm:block" aria-hidden="true" />
        <span className="hidden truncate text-ink sm:inline">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-14">
        <ProductGallery
          images={product.images}
          name={product.name}
          activeIndex={activeImage}
          onSelect={setActiveImage}
          saved={saved}
          onToggleWishlist={() => toggleWishlist(product.slug)}
        />

        <div className="flex flex-col">
          {onSale && discountPercent > 0 && (
            <span className="mb-3 inline-flex w-fit rounded-full bg-lime-400 px-2.5 py-0.5 text-[11px] font-bold text-ink">-{discountPercent}%</span>
          )}
          <h1 className="font-heading text-2xl font-bold leading-[1.1] tracking-tight text-ink sm:text-3xl">{product.name}</h1>
          <p className="mt-2 text-sm text-neutral-500">{product.subcategory}</p>

          <div className="mt-3 flex items-center gap-2">
            <Stars rating={Math.round(productRating(product.slug))} />
            <span className="text-sm text-neutral-500">({productReviewCount(product.slug)})</span>
          </div>

          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{formatUSD(product.price)}</span>
            {onSale && product.compare_at_price && (
              <span className="text-base text-neutral-400 line-through">{formatUSD(product.compare_at_price)}</span>
            )}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">{product.description || product.short_description}</p>

          <div className="mt-5 flex flex-col gap-5">
            <ProductVariantPicker
              product={product}
              size={size}
              color={color}
              onSizeChange={(option) => {
                setSize(option);
                setValidation(null);
              }}
              onColorChange={(option) => {
                setColor(option);
                setValidation(null);
              }}
            />

            {validation && (
              <p role="alert" className="border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{validation}</p>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center rounded-lg border border-neutral-300">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || soldOut}
                  className="flex h-9 w-9 items-center justify-center text-ink disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-xs" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  disabled={quantity >= maxQuantity || soldOut}
                  className="flex h-9 w-9 items-center justify-center text-ink disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm">
                {soldOut ? (
                  <span className="text-crimson-400">Sold out</span>
                ) : product.stock <= 5 ? (
                  <span className="text-neutral-600">Only {product.stock} left</span>
                ) : (
                  <span className="text-neutral-600">In stock</span>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button type="button" onClick={handleAddToCart} disabled={soldOut} className={`${buttonPrimary} w-full py-3`}>
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Add to bag
              </button>
              <button type="button" onClick={handleBuyNow} disabled={soldOut} className={`${buttonAccent} w-full py-3`}>
                <Zap className="h-4 w-4" aria-hidden="true" />
                Buy now
              </button>
            </div>

            {confirmation && (
              <p role="status" className="border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs">
                Added to your bag.{' '}
                <Link to="/cart" className="underline underline-offset-4">View bag</Link>
              </p>
            )}
          </div>


        </div>
      </div>


      {related.length > 0 && (
        <section className="mt-24">
          <p className={eyebrow}>You may also like</p>
          <h2 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Related pieces</h2>
          <div className="mt-8"><ProductGrid products={related} /></div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-20">
          <p className={eyebrow}>Your history</p>
          <h2 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Recently viewed</h2>
          <div className="mt-8"><ProductGrid products={recent} /></div>
        </section>
      )}
    </div>
  );
}
