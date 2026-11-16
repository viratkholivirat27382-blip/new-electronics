import { Home, Search, Heart, ShoppingBag, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/context/useStore';
import { useAuthSession } from '@/lib/auth';

const ICONS: Record<string, { icon: typeof Home; label: string }> = {
  home: { icon: Home, label: 'Home' },
  explore: { icon: Search, label: 'Explore' },
  wishlist: { icon: Heart, label: 'Wishlist' },
  cart: { icon: ShoppingBag, label: 'Cart' },
  profile: { icon: User, label: 'Profile' },
};

const LINKS: { key: string; to: string }[] = [
  { key: 'home', to: '/' },
  { key: 'explore', to: '/categories' },
  { key: 'wishlist', to: '/wishlist' },
  { key: 'cart', to: '/cart' },
  { key: 'profile', to: '/login' },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { cartCount, wishlistCount } = useStore();
  const session = useAuthSession();
  const navigate = useNavigate();

  const counts: Record<string, number> = {
    wishlist: wishlistCount,
    cart: cartCount,
  };

  const links = LINKS.map((link) =>
    link.key === 'profile' && session ? { ...link, to: '/admin' } : link,
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-neutral-200 bg-white/95 backdrop-blur lg:hidden" aria-label="Mobile navigation">
      {links.map(({ key, to }) => {
        const { icon: Icon, label } = ICONS[key];
        const active = pathname === to || (to !== '/' && pathname.startsWith(to));
        const count = counts[key];

        return (
          <Link
            key={key}
            to={to}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="relative">
              <Icon className={`h-5 w-5 transition-colors ${active ? 'text-lime-500' : 'text-neutral-400'}`} />
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-lime-400 px-1 text-[9px] font-bold text-ink">
                  {count}
                </span>
              )}
            </span>
            <span className={`text-[10px] font-medium transition-colors ${active ? 'text-lime-500' : 'text-neutral-400'}`}>
              {label}
            </span>
            {active && <span className="absolute top-0 h-0.5 w-full bg-lime-400" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
