import { Link } from 'react-router-dom';
import { sectionHeading } from '@/components/ui/styles';

export function SectionHeader({ title, linkTo, linkLabel }: { kicker?: string; title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 sm:gap-6">
      <h2 className={sectionHeading}>{title}</h2>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="shrink-0 text-xs uppercase tracking-wider text-neutral-600 underline underline-offset-4 transition-colors hover:text-ink">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
