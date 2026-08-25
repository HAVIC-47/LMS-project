import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { Skeleton } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Join to enroll in courses and track your progress.',
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-text-muted">
          New accounts start as students. Ask an admin if you need to teach or edit.
        </p>
      </div>

      <Suspense fallback={<FormSkeleton />}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-[72px]" />
      <Skeleton className="h-[72px]" />
      <Skeleton className="h-[72px]" />
      <Skeleton className="h-14 rounded-control" />
    </div>
  );
}
