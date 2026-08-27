'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChatCircleIcon, PaperPlaneTiltIcon, TrashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/primitives';

/**
 * The discussion under a course.
 *
 * Loaded on the client rather than server-rendered with the course. The course page is
 * cached and revalidated so the catalog stays fast; the thread changes by the minute, and
 * baking it in would either serve a stale discussion or force the page out of the cache.
 *
 * **Who may reply is the point of this feature**, so it is worth being precise about where
 * that is decided. Everything in this file is a hint: it hides a Reply button that would
 * come back 403, because offering an action that always fails is worse than not offering
 * it. The rule itself lives in the Strapi controller, which re-checks it on every write
 * against the parent comment's author and the course's owner. Editing this file cannot
 * grant anyone anything.
 */

type Role = 'admin' | 'content-manager' | 'instructor' | 'student' | null;

type Comment = {
  documentId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: Role;
  } | null;
  replies?: Comment[];
};

type Viewer = {
  id: number;
  /** Admin, Content Manager, or the Instructor who owns *this* course. */
  isStaff: boolean;
} | null;

/** Staff answers are labelled, so a student can tell one from another student's guess. */
const STAFF_LABEL: Record<string, string> = {
  admin: 'Admin',
  'content-manager': 'Content manager',
  instructor: 'Instructor',
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function load(courseDocumentId: string, set: (value: Comment[]) => void): Promise<void> {
  try {
    const response = await fetch(`/api/courses/${courseDocumentId}/comments`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    set(payload.data ?? []);
  } catch {
    // Leave what is on screen. A failed refresh is better than an emptied thread.
  }
}

export function CourseDiscussion({
  courseDocumentId,
  viewer,
}: {
  courseDocumentId: string;
  viewer: Viewer;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(`/api/courses/${courseDocumentId}/comments`, {
          cache: 'no-store',
        });
        const payload = await response.json();

        // The component may have unmounted while this was in flight.
        if (!cancelled) setComments(payload.data ?? []);
      } catch {
        if (!cancelled) setError('Could not load the discussion.');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [courseDocumentId]);

  const total = comments
    ? comments.reduce((sum, comment) => sum + 1 + (comment.replies?.length ?? 0), 0)
    : 0;

  return (
    <section className="flex w-full flex-col gap-8 border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl">Discussion</h2>

        <span className="flex items-center gap-2 text-sm text-text-muted">
          <ChatCircleIcon size={16} aria-hidden />
          <span className="font-mono tabular-nums text-text">{total}</span>
          {total === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      <p className="max-w-[68ch] text-sm text-text-muted">
        Ask about the material here. Anyone on the course can post a question; replies come
        from the teaching staff, and from whoever asked.
      </p>

      {error ? <FormError>{error}</FormError> : null}

      {viewer ? (
        <CommentForm
          courseDocumentId={courseDocumentId}
          onPosted={() => void load(courseDocumentId, setComments)}
        />
      ) : (
        <p className="rounded-card border border-line bg-surface px-5 py-4 text-sm text-text-muted">
          <Link href="/login" className="font-medium text-accent-text hover:underline">
            Log in
          </Link>{' '}
          to join the discussion.
        </p>
      )}

      {comments === null ? (
        <p className="text-sm text-text-muted">Loading the discussion</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-text-muted">
          No questions yet. {viewer ? 'Be the first to ask.' : ''}
        </p>
      ) : (
        <ol className="flex flex-col gap-8">
          {comments.map((comment) => (
            <li key={comment.documentId}>
              <CommentRow
                comment={comment}
                courseDocumentId={courseDocumentId}
                viewer={viewer}
                onChanged={() => void load(courseDocumentId, setComments)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  courseDocumentId,
  viewer,
  onChanged,
  isReply = false,
}: {
  comment: Comment;
  courseDocumentId: string;
  viewer: Viewer;
  onChanged: () => void;
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);

  const mine = viewer?.id === comment.author?.id;

  /**
   * The rule, mirrored for the UI only.
   *
   * Staff answer anyone. Everyone else answers only themselves -- which is how a student
   * adds to their own question rather than arguing with another student's.
   *
   * Only offered on top-level comments: the thread renders two levels, so a reply to a
   * reply would be flattened back up to the same place and read as a non-sequitur.
   */
  const canReply = Boolean(viewer) && !isReply && (viewer!.isStaff || mine);
  const canDelete = Boolean(viewer) && (viewer!.isStaff || mine);

  const staffLabel = comment.author?.role ? STAFF_LABEL[comment.author.role] : undefined;

  const remove = async () => {
    if (!window.confirm('Delete this comment? Replies to it go too.')) return;

    setBusy(true);

    try {
      await fetch(`/api/courses/comments/${comment.documentId}`, { method: 'DELETE' });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col gap-3">
      {/* `items-center` rather than `items-baseline`: an avatar has no text baseline to sit
          on, so baseline alignment drops it below the name. */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Avatar
          src={comment.author?.avatarUrl}
          name={comment.author?.displayName || comment.author?.username || '?'}
          size="sm"
        />

        {/* A comment whose author is gone has no profile to point at, so the name stays
            plain text rather than becoming a link to a 404. */}
        {comment.author ? (
          <Link
            href={`/u/${comment.author.username}`}
            className="font-medium text-text underline decoration-transparent underline-offset-4 transition-colors hover:decoration-line-strong"
          >
            {comment.author.displayName || comment.author.username}
          </Link>
        ) : (
          <span className="font-medium text-text-subtle">Deleted user</span>
        )}

        {staffLabel ? <Badge tone="accent">{staffLabel}</Badge> : null}

        <span className="microlabel">{timeAgo(comment.createdAt)}</span>
        {comment.editedAt ? <span className="microlabel">edited</span> : null}
      </header>

      <p className="whitespace-pre-wrap text-text-muted">{comment.body}</p>

      <div className="flex items-center gap-3">
        {canReply ? (
          <button
            type="button"
            onClick={() => setReplying((open) => !open)}
            className="cursor-pointer text-xs font-medium text-text-subtle transition-colors hover:text-accent-text"
          >
            {replying ? 'Cancel' : 'Reply'}
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-text-subtle transition-colors hover:text-danger disabled:opacity-50"
          >
            <TrashIcon size={13} aria-hidden />
            Delete
          </button>
        ) : null}
      </div>

      {replying ? (
        <CommentForm
          courseDocumentId={courseDocumentId}
          parentId={comment.documentId}
          placeholder={`Reply to ${comment.author?.username ?? 'this comment'}`}
          onPosted={() => {
            setReplying(false);
            onChanged();
          }}
        />
      ) : null}

      {comment.replies && comment.replies.length > 0 ? (
        <ol className="mt-2 flex flex-col gap-6 border-l border-line pl-5">
          {comment.replies.map((reply) => (
            <li key={reply.documentId}>
              <CommentRow
                comment={reply}
                courseDocumentId={courseDocumentId}
                viewer={viewer}
                onChanged={onChanged}
                isReply
              />
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

function CommentForm({
  courseDocumentId,
  parentId,
  placeholder = 'Ask a question about this course',
  onPosted,
}: {
  courseDocumentId: string;
  parentId?: string;
  placeholder?: string;
  onPosted: () => void;
}) {
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const text = body.trim();

    if (!text) {
      setError('Write something first.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseDocumentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, parentId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? 'Could not post that.');
        return;
      }

      setBody('');
      onPosted();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-[68ch] flex-col gap-3">
      <label htmlFor={`course-comment-${parentId ?? 'root'}`} className="sr-only">
        {placeholder}
      </label>

      <textarea
        id={`course-comment-${parentId ?? 'root'}`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        rows={parentId ? 3 : 4}
        maxLength={2000}
        className="w-full rounded-input border border-line-strong bg-surface-raised px-4 py-3 text-base leading-relaxed text-text placeholder:text-text-subtle focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
      />

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={pending}>
          <PaperPlaneTiltIcon size={14} aria-hidden />
          {parentId ? 'Reply' : 'Post question'}
        </Button>
        <span className="microlabel">{body.length} / 2000</span>
      </div>
    </form>
  );
}
