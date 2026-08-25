'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';

type Mode = 'login' | 'signup';

/**
 * Login and signup share one component because they differ by one field and one endpoint.
 *
 * The credentials go to our own route handler, never to Strapi from the browser. The
 * handler swaps them for a JWT and stores it in an httpOnly cookie, so nothing sensitive
 * ever exists in client memory or `localStorage`.
 *
 * After success it uses `router.refresh()` before navigating: that re-runs the server
 * layout so the header re-renders as signed in. Pushing without refreshing would leave the
 * old, logged-out header in place until something else invalidated it.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({});

  const router = useRouter();
  const searchParams = useSearchParams();

  // Only same-origin paths are honoured. Accepting an absolute URL here would turn the
  // login page into an open redirect that phishing links could point through.
  const requestedNext = searchParams.get('next');
  const next = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard';

  const isSignup = mode === 'signup';

  const validate = (form: FormData) => {
    const errors: typeof fieldErrors = {};

    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email) {
      errors.email = 'Enter your email address.';
    } else if (isSignup && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.email = 'That does not look like an email address.';
    }

    if (!password) {
      errors.password = 'Enter your password.';
    } else if (isSignup && password.length < 8) {
      errors.password = 'Use at least 8 characters.';
    }

    if (isSignup && !String(form.get('username') ?? '').trim()) {
      errors.username = 'Tell us what to call you.';
    }

    return errors;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const errors = validate(form);

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    setError(null);

    const body = isSignup
      ? {
          username: String(form.get('username') ?? '').trim(),
          email: String(form.get('email') ?? '').trim(),
          password: String(form.get('password') ?? ''),
        }
      : {
          identifier: String(form.get('email') ?? '').trim(),
          password: String(form.get('password') ?? ''),
        };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? 'Something went wrong. Try again.');
        return;
      }

      router.refresh();
      router.replace(next);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error ? <FormError>{error}</FormError> : null}

      {isSignup ? (
        <Field
          label="Name"
          name="username"
          type="text"
          autoComplete="name"
          error={fieldErrors.username}
          placeholder="Ama Boateng"
        />
      ) : null}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email}
        placeholder="you@example.com"
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignup ? 'new-password' : 'current-password'}
        error={fieldErrors.password}
        hint={isSignup ? 'At least 8 characters.' : undefined}
      />

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {isSignup ? 'Create account' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-text-muted">
        {isSignup ? 'Already have an account? ' : 'New here? '}
        <Link
          href={isSignup ? `/login${requestedNext ? `?next=${encodeURIComponent(next)}` : ''}` : `/signup${requestedNext ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-accent-text"
        >
          {isSignup ? 'Log in' : 'Create one'}
        </Link>
      </p>
    </form>
  );
}
