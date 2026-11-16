import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Heart, Menu, Search, ShoppingCart, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SideNav } from '@/components/layout/SideNav';
import { ShopiesLogo } from '@/components/layout/ShopiesLogo';
import { useStore } from '@/context/useStore';
import { useAuthSession } from '@/lib/auth';

const ICON_LINK = 'relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10';

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lime-400 px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop All', to: '/shop' },
  { label: 'New Arrivals', to: '/new-arrivals' },
  { label: 'Best Sellers', to: '/best-sellers' },
  { label: 'Deals', to: '/sale' },
  { label: 'Shipping', to: '/policy/shipping' },
  { label: 'Returns', to: '/policy/returns' },
];

export function SiteHeader() {
  const { cartCount, wishlistCount } = useStore();
  const session = useAuthSession();
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const closeNav = useCallback(() => setNavOpen(false), []);
  const [cartNotice, setCartNotice] = useState<{ name: string; image?: string } | null>(null);

  useEffect(() => {
    const handleCartAdded = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; image?: string }>).detail;
      if (!detail?.name) return;
      setCartNotice({ name: detail.name, image: detail.image });
      window.setTimeout(() => setCartNotice(null), 3500);
    };
    window.addEventListener('cart-added', handleCartAdded);
    return () => window.removeEventListener('cart-added', handleCartAdded);
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    setQuery('');
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-ink text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 pb-2 pt-2.5 lg:gap-6 lg:px-8 lg:py-3">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link to="/" aria-label="Shopies home" className="shrink-0">
            <ShopiesLogo className="font-heading text-2xl text-white lg:text-3xl" />
          </Link>

          <form role="search" onSubmit={submitSearch} className="order-last hidden min-w-0 flex-1 lg:order-none lg:flex">
            <SearchField id="site-search-desktop" query={query} setQuery={setQuery} />
          </form>

          <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
            <Link to={session ? '/admin' : '/login'} className={`${ICON_LINK} hidden sm:flex`} aria-label={session ? 'Admin panel' : 'Sign in'}>
              <User className="h-5 w-5" />
            </Link>
            <Link to="/wishlist" className={`${ICON_LINK} hidden sm:flex`} aria-label={`Wishlist, ${wishlistCount} items`}>
              <Heart className="h-5 w-5" />
              <CountBadge count={wishlistCount} />
            </Link>
            <Link to="/cart" className={ICON_LINK} aria-label={`Shopping cart, ${cartCount} items`}>
              <ShoppingCart className="h-6 w-6" />
              <CountBadge count={cartCount} />
            </Link>
          </div>
        </div>

        <form role="search" onSubmit={submitSearch} className="px-3 pb-2.5 lg:hidden">
          <SearchField id="site-search-mobile" query={query} setQuery={setQuery} />
        </form>

        <nav className="border-t border-white/10 bg-[#102a4c]" aria-label="Quick links">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 py-1 [scrollbar-width:none] lg:px-8 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="hidden shrink-0 items-center gap-1.5 rounded px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 lg:flex"
            >
              <Menu className="h-4 w-4" /> All
            </button>
            {NAV_LINKS.map((link) => (
              <Link key={link.to + link.label} to={link.to} className="shrink-0 rounded px-3 py-2 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <SideNav open={navOpen} onClose={closeNav} />

      {cartNotice && (
        <div className="fixed right-3 top-28 z-50 flex w-[min(calc(100vw-1.5rem),360px)] animate-fade-in items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-ink shadow-2xl" role="status">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-500 text-white">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" /></svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Added to cart</p>
            <p className="mt-0.5 truncate text-xs text-neutral-500">{cartNotice.name}</p>
          </div>
          <Link to="/cart" className="ml-auto shrink-0 rounded-full bg-lime-500 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white">View</Link>
        </div>
      )}
    </>
  );
}

function SearchField({ id, query, setQuery }: { id: string; query: string; setQuery: (value: string) => void }) {
  return (
    <div className="flex h-11 w-full overflow-hidden rounded-lg bg-white ring-2 ring-transparent focus-within:ring-lime-400">
      <label htmlFor={id} className="sr-only">Search Shopies</label>
      <input
        id={id}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search headphones, speakers, chargers..."
        className="min-w-0 flex-1 bg-transparent px-4 text-sm text-ink placeholder:text-neutral-400 focus:outline-none"
      />
      <button type="submit" aria-label="Search" className="flex w-12 shrink-0 items-center justify-center bg-lime-500 text-white transition-colors hover:bg-lime-600">
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
}
