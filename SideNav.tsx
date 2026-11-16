import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShopiesLogo } from '@/components/layout/ShopiesLogo';
import { useCategories } from '@/context/useCategories';
import { useAuthSession } from '@/lib/auth';
import { STOREFRONT_CATEGORY } from '@/lib/catalog';
import { subcategorySlug, type CategoryDef } from '@/lib/categories';

type NavLinkItem = { label: string; to: string };

const SHOP_LINKS: NavLinkItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Shop All', to: '/shop' },
  { label: 'New Arrivals', to: '/new-arrivals' },
  { label: 'Best Sellers', to: '/best-sellers' },
  { label: 'Deals', to: '/sale' },
];

const HELP_LINKS: NavLinkItem[] = [
  { label: 'Shipping Policy', to: '/policy/shipping' },
  { label: 'Refund Policy', to: '/policy/returns' },
];

function toCategoryGroups(categories: CategoryDef[]) {
  return categories.map((category) => ({
    slug: category.slug,
    label: category.label,
    to: `/category/${category.slug}`,
    children: category.subcategories.map((sub) => ({
      label: sub.name,
      to: `/category/${category.slug}/${subcategorySlug(sub.name)}`,
    })),
  }));
}

export function SideNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useAuthSession();
  const { categories } = useCategories();
  const categoryGroups = toCategoryGroups((categories ?? []).filter((c) => c.slug === STOREFRONT_CATEGORY));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveCategory(null);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const activeGroup = categoryGroups.find((group) => group.slug === activeCategory) ?? null;
  const handleClose = () => {
    setActiveCategory(null);
    onClose();
  };
  const linkClass = 'flex items-center justify-between border-b border-neutral-100 py-4 text-sm font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:text-ink';

  return (
    <div className={`fixed inset-0 z-50 transition-[visibility] duration-300 ${open ? 'visible' : 'invisible'}`} aria-hidden={!open}>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        onClick={handleClose}
        aria-label="Close menu"
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`absolute inset-y-0 left-0 flex w-[min(88vw,390px)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Site navigation"
      >
        <div className="flex min-h-[64px] items-center gap-3 bg-ink px-5 text-white">
          {activeGroup ? (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Back to main menu"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="flex-1">
            {activeGroup ? (
              <p className="text-sm font-bold uppercase tracking-wider text-white">{activeGroup.label}</p>
            ) : (
              <ShopiesLogo className="text-3xl text-white" />
            )}
          </div>
          <button type="button" onClick={handleClose} tabIndex={open ? 0 : -1} aria-label="Close menu" className="p-2 text-white transition-transform duration-300 hover:rotate-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 pb-10" aria-label="Main">
          {activeGroup ? (
            <div className="animate-fade-in pt-5">
              <Link to={activeGroup.to} onClick={handleClose} className="mb-3 flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-4 text-sm font-bold uppercase tracking-wider text-ink hover:bg-lime-100">
                View all {activeGroup.label}
                <ChevronRight className="h-4 w-4" />
              </Link>
              <p className="mb-2 mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Shop by type</p>
              {activeGroup.children.map((child) => (
                <Link key={child.to} to={child.to} onClick={handleClose} className={linkClass}>
                  {child.label}
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="mb-2 mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Shop</p>
              {SHOP_LINKS.map((item) => (
                <Link key={item.to} to={item.to} onClick={handleClose} className={linkClass}>{item.label}</Link>
              ))}

              <p className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Categories</p>
              {categoryGroups.map((group) => (
                <div key={group.slug} className="flex items-center border-b border-neutral-100">
                  <Link to={group.to} onClick={handleClose} className="flex-1 py-4 text-sm font-semibold uppercase tracking-wider text-neutral-700 hover:text-ink">{group.label}</Link>
                  <button type="button" onClick={() => setActiveCategory(group.slug)} aria-label={`Open ${group.label} options`} className="p-3 text-neutral-500 transition-colors hover:text-ink">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <p className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Account</p>
              <Link to="/wishlist" onClick={handleClose} className={linkClass}>Wishlist</Link>
              <Link to="/cart" onClick={handleClose} className={linkClass}>Shopping Bag</Link>
              <Link to={session ? '/admin' : '/login'} onClick={handleClose} className={linkClass}>{session ? 'Admin Panel' : 'Sign In'}</Link>

              <p className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Help</p>
              {HELP_LINKS.map((item) => (
                <Link key={item.to} to={item.to} onClick={handleClose} className={linkClass}>{item.label}</Link>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </div>
  );
}
