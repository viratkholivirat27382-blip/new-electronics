import { Headset, RotateCcw, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';

const PROMISES: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Truck, title: 'Free shipping', detail: 'On orders over $50' },
  { icon: RotateCcw, title: '30-day returns', detail: 'Easy, no hassle' },
  { icon: ShieldCheck, title: 'Secure checkout', detail: 'Safe and protected' },
  { icon: Headset, title: 'Friendly support', detail: 'We reply within a day' },
];

export function TrustStrip() {
  return (
    <section aria-label="Our promises" className="border-b border-neutral-200 bg-white">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-4 px-4 py-4 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-5">
        {PROMISES.map(({ icon: Icon, title, detail }) => (
          <li key={title} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lime-600">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-ink sm:text-sm">{title}</p>
              <p className="truncate text-[11px] text-neutral-500 sm:text-xs">{detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
