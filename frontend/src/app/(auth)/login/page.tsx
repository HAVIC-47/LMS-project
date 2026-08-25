import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { Skeleton } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Sign in to continue your courses.',
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-text-muted">Pick up where you left off.</p>
      </div>

      {/* `useSearchParams` reads the `next` parameter, which forces this subtree to render
          on the client. The Suspense boundary keeps the rest of the page static. */}
      <Suspense fallback={<FormSkeleton />}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-[72px]" />
      <Skeleton className="h-[72px]" />
      <Skeleton className="h-14 rounded-control" />
    </div>
  );
}
