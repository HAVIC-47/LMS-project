'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckIcon, SealCheckIcon } from '@phosphor-icons/react';
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
  const [certificate, setCertificate] = useState<{ serial: string } | null>(null);
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

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? 'Could not save your progress.');
        return;
      }

      // The API returns a certificate on the completion that earns one. It was being
      // discarded, so a student could finish a course and be told nothing at all.
      setCertificate(data?.data?.certificate ?? null);
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Shown above the buttons, not below the error slot: this is the best thing that
          happens in the product and it should not appear underneath the row it belongs to. */}
      {certificate ? (
        <div className="flex flex-col gap-2 rounded-card border border-accent bg-accent-soft p-4">
          <span className="flex items-center gap-2">
            <SealCheckIcon size={17} weight="fill" aria-hidden className="text-accent-text" />
            <span className="microlabel">Course complete</span>
          </span>
          <p className="text-sm text-text">
            That was the last lesson — your certificate has been issued.
          </p>
          <a
            href={`/certificates/${certificate.serial}`}
            className="w-fit text-sm font-medium text-accent-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
          >
            View certificate {certificate.serial}
          </a>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {completed ? (
          <>
            <span className="flex items-center gap-2 rounded-control border border-success/30 bg-success-soft px-4 py-2.5 text-sm font-medium text-success">
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
