import { Link, useParams } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { buttonPrimary, eyebrow } from '@/components/ui/styles';
import { getPolicy } from '@/lib/policies';

export function PolicyPage() {
  const { slug = '' } = useParams();
  const policy = getPolicy(slug);

  if (!policy) return <NotFoundPage />;

  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-12 lg:pt-16">
      <p className={eyebrow}>Policies</p>
      <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">{policy.title}</h1>
      <p className="mt-6 text-base leading-relaxed text-neutral-600">{policy.intro}</p>

      <div className="mt-12 space-y-10 border-t border-neutral-200 pt-12">
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-heading text-2xl font-bold">{section.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{section.body}</p>
          </section>
        ))}
      </div>

      <Link to="/shop" className={`${buttonPrimary} mt-16`}>Continue shopping</Link>
    </article>
  );
}
