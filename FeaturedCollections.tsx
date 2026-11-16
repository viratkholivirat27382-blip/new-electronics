import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const COLLECTIONS = [
  { slug: 'shoes-sneakers', title: "The runner's edit", desc: 'Knit runners, mats and trail gear built for motion.', image: '/images/a0d82331-0c2f-430e-a073-28970a186833.png' },
  { slug: 'home-living', title: 'Quiet luxury home', desc: 'Oak, bouclé and ceramics in warm neutral tones.', image: '/images/cd6202c5-8bf3-4f61-abd5-9e1ed4954ad1.png' },
  { slug: 'beauty-personal-care', title: 'Daily glow ritual', desc: 'Clinical skincare and scent worth the shelf space.', image: '/images/f4260db1-2197-4aa4-b623-a8bff7882c02.png' },
];

export function FeaturedCollections() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-12">
      <div className="flex items-end justify-between gap-6">
        <h2 className="font-heading text-2xl font-extrabold leading-[1.15] text-ink sm:text-3xl lg:text-4xl">Featured collections</h2>
        <Link to="/categories" className="text-xs uppercase tracking-wider text-neutral-600 underline underline-offset-4 transition-colors hover:text-ink">
          All collections
        </Link>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {COLLECTIONS.map((col) => {
          return (
            <Link
              key={col.slug}
              to={`/category/${col.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-900"
            >
              <img src={col.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <h3 className="text-lg font-bold leading-tight">{col.title}</h3>
                <p className="mt-2 text-sm text-white/70">{col.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-lime-400">
                  Shop now <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
