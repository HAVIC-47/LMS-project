'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StarIcon, TrashIcon } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { Stars } from '@/components/ui/stars';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

/**
 * Ratings and reviews for one course.
 *
 * Loaded on the client rather than server-rendered with the page, for the same reason the
 * comment thread is: the page itself is cached and served fast to everybody, while this is
 * personal — whether *you* have already rated it — and baking it in would either serve a
 * stale average or force the article out of the cache entirely.
 *
 * The form is the same control whether you are writing a first review or editing your
 * existing one. A separate "edit" mode would imply you can hold two.
 */

type Review = {
  documentId: string;
  rating: number;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

type Summary = {
  count: number;
  average: number;
  distribution: Record<string, number>;
  reviews: Review[];
  mine: Review | null;
};

type Viewer = { id: number; canModerate: boolean } | null;

export function ReviewPanel({
  targetType,
  targetDocumentId,
  viewer,
  /** False when the viewer is signed in but not entitled — a non-enrolled student. */
  canReview,
  cannotReviewReason,
}: {
  targetType: 'course';
  targetDocumentId: string;
  viewer: Viewer;
  canReview: boolean;
  cannotReviewReason?: string;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    try {
      const response = await fetch(`/api/reviews/for/${targetType}/${targetDocumentId}`, {
        cache: 'no-store',
      });
      const payload = await response.json();
      const data = payload.data as Summary | undefined;

      setSummary(data ?? null);

      // Pre-fill from the existing review, so the form opens as an edit rather than
      // silently replacing what they wrote last time.
      if (data?.mine) {
        setRating(data.mine.rating);
        setBody(data.mine.body ?? '');
      }
    } catch {
      setError('Could not load the ratings.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetDocumentId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (rating < 1) {
      setError('Pick a rating from 1 to 5.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetDocumentId, rating, body }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'Could not save your rating.');
        return;
      }

      await load();
      // The average is shown on the card and the detail header, both server-rendered.
      router.refresh();
    } catch {
      setError('Could not save your rating.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (documentId: string) => {
    if (!window.confirm('Delete this review?')) return;

    setBusy(true);

    try {
      await fetch(`/api/reviews/${documentId}`, { method: 'DELETE' });
      setRating(0);
      setBody('');
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-8 border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-serif text-2xl">Ratings</h2>
        {summary && summary.count > 0 ? (
          <Stars value={summary.average} count={summary.count} size={16} />
        ) : null}
      </div>

      {error ? <FormError>{error}</FormError> : null}

      {summary && summary.count > 0 ? (
        <Distribution summary={summary} />
      ) : (
        <p className="text-sm text-text-muted">
          No ratings yet. {canReview ? `Be the first to rate this course.` : ''}
        </p>
      )}

      {viewer && canReview ? (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text">
              {summary?.mine ? 'Update your rating' : 'Your rating'}
            </span>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1500}
            rows={3}
            placeholder={`What should someone know before starting this course? (optional)`}
            className="w-full rounded-input border border-line-strong bg-surface-raised px-4 py-3 text-base leading-relaxed text-text placeholder:text-text-subtle focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" loading={busy}>
              {summary?.mine ? 'Update' : 'Post rating'}
            </Button>

            {summary?.mine ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(summary.mine!.documentId)}
                className="gap-1.5"
              >
                <TrashIcon size={14} aria-hidden />
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      ) : viewer ? (
        <p className="rounded-card border border-line bg-surface px-5 py-4 text-sm text-text-muted">
          {cannotReviewReason ?? `You cannot rate this course.`}
        </p>
      ) : (
        <p className="rounded-card border border-line bg-surface px-5 py-4 text-sm text-text-muted">
          <Link href="/login" className="font-medium text-accent-text hover:underline">
            Log in
          </Link>{' '}
          to rate this course.
        </p>
      )}

      {summary && summary.reviews.length > 0 ? (
        <ol className="flex flex-col gap-6">
          {summary.reviews.map((review) => (
            <li key={review.documentId} className="flex gap-3">
              <Avatar
                src={review.author?.avatarUrl}
                name={review.author?.displayName || review.author?.username || '?'}
                size="sm"
                className="mt-0.5"
              />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {review.author ? (
                    <Link
                      href={`/u/${review.author.username}`}
                      className="font-medium text-text underline decoration-transparent underline-offset-4 transition-colors hover:decoration-line-strong"
                    >
                      {review.author.displayName || review.author.username}
                    </Link>
                  ) : (
                    <span className="font-medium text-text-subtle">Deleted user</span>
                  )}

                  <Stars value={review.rating} size={12} />
                  <span className="microlabel">{formatDate(review.createdAt)}</span>
                  {review.editedAt ? <span className="microlabel">edited</span> : null}
                </div>

                {review.body ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                    {review.body}
                  </p>
                ) : null}

                {viewer?.canModerate && review.author?.id !== viewer.id ? (
                  <button
                    type="button"
                    onClick={() => remove(review.documentId)}
                    className="flex w-fit cursor-pointer items-center gap-1 text-xs font-medium text-text-subtle transition-colors hover:text-danger"
                  >
                    <TrashIcon size={12} aria-hidden />
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

/** The five-bar breakdown. Shows *where* an average comes from, which an average cannot. */
function Distribution({ summary }: { summary: Summary }) {
  return (
    <dl className="flex flex-col gap-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const value = summary.distribution[String(star)] ?? 0;
        const share = summary.count === 0 ? 0 : (value / summary.count) * 100;

        return (
          <div key={star} className="flex items-center gap-3">
            <dt className="w-10 shrink-0 font-mono text-xs tabular-nums text-text-subtle">
              {star}★
            </dt>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-shell">
              <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
            </div>
            <dd className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-text-muted">
              {value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * The star picker.
 *
 * Radio inputs rather than buttons, so arrow keys move between values and the group
 * announces as one control with a current selection — which is what it is.
 */
function RatingInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <label
          key={star}
          className="cursor-pointer rounded-control p-1 transition-transform duration-200 hover:scale-110 focus-within:ring-2 focus-within:ring-accent/40"
        >
          <input
            type="radio"
            name="rating"
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="sr-only"
          />
          <StarIcon
            size={26}
            weight={star <= value ? 'fill' : 'regular'}
            aria-hidden
            className={cn(
              'transition-colors duration-200',
              star <= value ? 'text-accent' : 'text-line-strong'
            )}
          />
          <span className="sr-only">
            {star} star{star === 1 ? '' : 's'}
          </span>
        </label>
      ))}
    </div>
  );
}
