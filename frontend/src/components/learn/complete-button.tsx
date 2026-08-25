'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckIcon } from '@phosphor-icons/react';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';

/**
 * Mark complete / undo.
 *
 * Not optimistic. The percentage in the sidebar is the number this project is judged on,
 * so it is only ever redrawn from what the server confirmed. Flashing a new percentage and
 * rolling it back on failure would be worse than a moment of latency.
 *
 * `router.refresh()` re-runs the server layout, which re-reads progress and re-renders the
 * sidebar. The button holds no completion state of its own beyond the in-flight flag.
 */
export function CompleteButton({
  lessonId,
  completed,
  nextHref,
}: {
  lessonId: string;
  completed: boolean;
  nextHref: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggle = async () => {
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed: !completed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? 'Could not save your progress.');
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
      <div className="flex flex-wrap items-center gap-3">
        {completed ? (
          <>
            <span className="flex items-center gap-2 rounded-pill border border-success/30 bg-success-soft px-4 py-2.5 text-sm font-medium text-success">
              <CheckIcon size={15} weight="bold" aria-hidden />
              Completed
            </span>
            <Button variant="ghost" size="sm" onClick={toggle} loading={pending}>
              Mark as not done
            </Button>
          </>
        ) : (
          <Button size="md" onClick={toggle} loading={pending}>
            <CheckIcon size={15} weight="bold" aria-hidden />
            Mark complete
          </Button>
        )}

        {nextHref ? (
          <ButtonLink href={nextHref} variant="outline" size="md">
            Next lesson
            <ArrowRightIcon size={15} aria-hidden />
          </ButtonLink>
        ) : null}
      </div>

      {error ? <FormError>{error}</FormError> : null}
    </div>
  );
}
