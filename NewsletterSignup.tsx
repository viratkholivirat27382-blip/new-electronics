import { useState, type FormEvent } from 'react';
import { buttonAccent, inputBase } from '@/components/ui/styles';
import { supabase } from '@/lib/supabase';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_EMAIL_CODE = '23505';

type Status = 'idle' | 'saving' | 'done' | 'error';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setStatus('saving');
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: normalized });
    if (error && error.code !== DUPLICATE_EMAIL_CODE) {
      setStatus('error');
      setErrorMessage('We could not save your email. Please try again.');
      return;
    }
    setStatus('done');
    setEmail('');
  };

  return (
    <section className="bg-ink py-14" aria-labelledby="newsletter-heading">
      <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-lime-400" aria-hidden="true" />
        <h2 id="newsletter-heading" className="font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          Stay Ahead of the Trends
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          Get exclusive offers, new arrivals, and the latest shopping updates.
        </p>

        {status === 'done' ? (
          <p role="status" className="mt-8 text-sm font-medium text-lime-400">Thank you for subscribing. We will be in touch.</p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row" noValidate>
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email address"
              aria-invalid={status === 'error'}
              className={`${inputBase} border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-500 focus:border-lime-400 focus:ring-lime-400`}
            />
            <button type="submit" disabled={status === 'saving'} className={`${buttonAccent} sm:shrink-0`}>
              {status === 'saving' ? 'Subscribing' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p role="alert" className="mt-4 text-sm text-crimson-400">{errorMessage}</p>
        )}

        <p className="mt-5 text-xs text-neutral-500">One considered email a week. No noise. Unsubscribe anytime.</p>
      </div>
    </section>
  );
}
