import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buttonPrimary, eyebrow, inputBase, labelBase } from '@/components/ui/styles';
import { signInWithPassword } from '@/lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-16 lg:pt-24">
      <p className={eyebrow}>Account</p>
      <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">Sign in</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-6">
        <div>
          <label htmlFor="login-email" className={labelBase}>Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputBase}
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className={labelBase}>Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputBase}
            required
          />
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-crimson-500 pl-3 text-sm text-crimson-400">{error}</p>
        )}

        <button type="submit" disabled={submitting} className={`${buttonPrimary} w-full`}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
