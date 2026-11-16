import { Link } from 'react-router-dom';
import { buttonPrimary, eyebrow } from '@/components/ui/styles';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className={eyebrow}>Error 404</p>
      <h1 className="mt-4 font-heading text-4xl font-bold sm:text-5xl">This page could not be found</h1>
      <p className="mt-4 text-sm text-neutral-600">The link may be out of date, or the page may have moved.</p>
      <Link to="/" className={`${buttonPrimary} mt-10`}>Back to home</Link>
    </section>
  );
}
