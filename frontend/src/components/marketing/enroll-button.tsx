'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';

/**
 * Enroll action.
 *
 * Not optimistic. Enrolling is a one-off commitment that either works or does not, and
 * showing "Enrolled" a moment before the server disagrees would be worse than a short
 * wait. The button reports its own pending state and cannot be double-submitted.
 *
 * On success it calls `router.refresh()`, which re-runs the Server Component that rendered
 * this page. The enrolled state then comes back from the server rather than being faked in
 * client state, so a reload shows the same thing.
 */
export function EnrollButton({ courseId }: { courseId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const enroll = async () => {
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? 'Could not enroll you right now.');
        return;
      }

      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" withArrow onClick={enroll} loading={pending}>
        Enroll
      </Button>
      {error ? <FormError>{error}</FormError> : null}
    </div>
  );
}

/** Shown once the server confirms an enrollment exists. */
export function EnrolledNotice() {
  return (
    <p className="flex items-center gap-2 rounded-input border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
      <CheckCircleIcon size={18} weight="fill" aria-hidden />
      You are enrolled in this course.
    </p>
  );
}
