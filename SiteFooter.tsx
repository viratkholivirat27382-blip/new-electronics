import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { ShopiesLogo } from '@/components/layout/ShopiesLogo';
import { useCategories } from '@/context/useCategories';
import { STOREFRONT_CATEGORY } from '@/lib/catalog';

const SHOP_LINKS = [
  { label: 'All Products', to: '/shop' },
  { label: 'New Arrivals', to: '/new-arrivals' },
  { label: 'Best Sellers', to: '/best-sellers' },
  { label: 'Deals', to: '/sale' },
  { label: 'Wishlist', to: '/wishlist' },
];

const SUPPORT_LINKS = [
  { label: 'Contact Us', to: '/policy/returns' },
  { label: 'FAQ', to: '/policy/returns' },
  { label: 'Shipping Policy', to: '/policy/shipping' },
  { label: 'Returns & Refunds', to: '/policy/returns' },
  { label: 'Track Order', to: '/policy/shipping' },
];

const COMPANY_LINKS = [
  { label: 'About Us', to: '/policy/shipping' },
  { label: 'Privacy Policy', to: '/policy/returns' },
  { label: 'Terms & Conditions', to: '/policy/shipping' },
];

const linkClass = 'text-sm text-neutral-400 transition-colors hover:text-white';

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">{title}</h2>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className={linkClass}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentLogos() {
  return (
    <ul className="flex flex-wrap items-center gap-3" aria-label="Accepted payment methods">
      <li className="flex h-8 min-w-[56px] items-center justify-center border border-neutral-700 bg-white px-3">
        <span className="font-heading text-base font-bold italic tracking-tight text-ink" aria-label="Visa">VISA</span>
      </li>
      <li className="flex h-8 min-w-[56px] items-center justify-center gap-1 border border-neutral-700 bg-white px-3">
        <span className="h-4 w-4 rounded-full border border-neutral-700" aria-hidden="true" />
        <span className="-ml-2 h-4 w-4 rounded-full bg-neutral-700" aria-hidden="true" />
        <span className="sr-only">Mastercard</span>
      </li>
      <li className="flex h-8 min-w-[56px] items-center justify-center border border-neutral-700 bg-white px-3">
        <span className="text-[10px] font-bold uppercase tracking-tight text-ink" aria-label="American Express">AMEX</span>
      </li>
    </ul>
  );
}

export function SiteFooter() {
  const { categories } = useCategories();
  return (
    <footer className="bg-ink">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full bg-[#102a4c] py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#17385f]"
      >
        Back to top
      </button>
      <div className="pt-12" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-10 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-2">
          <Link to="/" aria-label="Shop home" className="inline-block">
            <ShopiesLogo className="text-3xl text-white" />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-neutral-400">
            Your trusted store for headphones, speakers and everyday tech, shipped across the USA.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="#" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-colors hover:border-white hover:text-white">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Twitter" className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-colors hover:border-white hover:text-white">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-colors hover:border-white hover:text-white">
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>

        <FooterColumn title="Shop" links={SHOP_LINKS} />
        <FooterColumn title="Support" links={SUPPORT_LINKS} />
        <FooterColumn title="Company" links={COMPANY_LINKS} />
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">Categories</h2>
          <ul className="mt-5 space-y-3">
            {(categories ?? []).filter((c) => c.slug === STOREFRONT_CATEGORY).map((cat) => (
              <li key={cat.slug}>
                <Link to={`/category/${cat.slug}`} className={linkClass}>{cat.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-6 border-t border-neutral-800 px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">&copy; 2026 Shopies. All Rights Reserved.</p>
          <PaymentLogos />
        </div>
      </div>
    </footer>
  );
}
