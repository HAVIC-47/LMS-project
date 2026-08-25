'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChatCircleIcon, HeartIcon, PaperPlaneTiltIcon, TrashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { cn } from '@/lib/cn';

/**
 * Likes and the comment thread for one post.
 *
 * Loaded on the client rather than server-rendered with the post. The post itself is
 * cached and revalidated so it can be served fast to everybody; the discussion changes by
 * the minute and is personal (whether *you* liked it), so baking it into the cached page
 * would either serve a stale thread or force the article out of the cache entirely.
 */

type Comment = {
  documentId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: { id: number; username: string } | null;
  replies?: Comment[];
};

type Viewer = { id: number; username: string; canModerate: boolean } | null;

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

export function PostEngagement({
  postDocumentId,
  viewer,
}: {
  postDocumentId: string;
  viewer: Viewer;
}) {
  const [likes, setLikes] = useState({ count: 0, liked: false });
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [likeResponse, commentResponse] = await Promise.all([
          fetch(`/api/blog/${postDocumentId}/likes`, { cache: 'no-store' }),
          fetch(`/api/blog/${postDocumentId}/comments`, { cache: 'no-store' }),
        ]);

        const likeData = await likeResponse.json();
        const commentData = await commentResponse.json();

        // The component may have unmounted while these were in flight.
        if (cancelled) return;

        setLikes(likeData.data ?? { count: 0, liked: false });
        setComments(commentData.data ?? []);
      } catch {
        if (!cancelled) setError('Could not load the discussion.');
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [postDocumentId]);

  const toggleLike = async () => {
    if (!viewer) return;

    // Optimistic: a like is trivially reversible and the delay would be the whole
    // interaction. Reconciled with the server's count on response.
    const previous = likes;
    setLikes({ count: likes.count + (likes.liked ? -1 : 1), liked: !likes.liked });

    try {
      const response = await fetch(`/api/blog/${postDocumentId}/likes`, { method: 'POST' });

      if (!response.ok) throw new Error();

      const payload = await response.json();
      setLikes(payload.data);
    } catch {
      setLikes(previous);
      setError('Could not save that. Try again.');
    }
  };

  const total = comments
    ? comments.reduce((sum, comment) => sum + 1 + (comment.replies?.length ?? 0), 0)
    : 0;

  return (
    <section className="mx-auto flex w-full max-w-[68ch] flex-col gap-10 border-t border-line pt-10">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={toggleLike}
          disabled={!viewer}
          aria-pressed={likes.liked}
          title={viewer ? undefined : 'Sign in to like this post'}
          className={cn(
            'flex h-11 cursor-pointer items-center gap-2 rounded-control border px-4 text-sm transition-colors duration-200',
            likes.liked
              ? 'border-accent bg-accent-soft text-accent-text'
              : 'border-line-strong text-text-muted hover:border-accent hover:text-accent-text',
            !viewer && 'cursor-not-allowed opacity-60'
          )}
        >
          <HeartIcon size={16} weight={likes.liked ? 'fill' : 'regular'} aria-hidden />
          <span className="font-mono tabular-nums">{likes.count}</span>
          <span className="sr-only">{likes.liked ? 'Unlike this post' : 'Like this post'}</span>
        </button>

        <span className="flex items-center gap-2 text-sm text-text-muted">
          <ChatCircleIcon size={16} aria-hidden />
          <span className="font-mono tabular-nums text-text">{total}</span>
          {total === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex flex-col gap-8">
        <h2 className="font-serif text-2xl">Discussion</h2>

        {viewer ? (
          <CommentForm
            postDocumentId={postDocumentId}
            onPosted={() => {
              // Re-read from the server rather than splicing the new comment in: the
              // server assigns the id and timestamp, and guessing them locally is how a
              // list ends up with two copies after the next refresh.
              void reload(postDocumentId, setComments);
              router.refresh();
            }}
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
            No comments yet. {viewer ? 'Be the first.' : ''}
          </p>
        ) : (
          <ol className="flex flex-col gap-8">
            {comments.map((comment) => (
              <li key={comment.documentId}>
                <CommentRow
                  comment={comment}
                  postDocumentId={postDocumentId}
                  viewer={viewer}
                  onChanged={() => void reload(postDocumentId, setComments)}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

async function reload(
  postDocumentId: string,
  setComments: (value: Comment[]) => void
): Promise<void> {
  try {
    const response = await fetch(`/api/blog/${postDocumentId}/comments`, { cache: 'no-store' });
    const payload = await response.json();
    setComments(payload.data ?? []);
  } catch {
    // Leave what is on screen. A failed refresh is better than an emptied thread.
  }
}

function CommentRow({
  comment,
  postDocumentId,
  viewer,
  onChanged,
}: {
  comment: Comment;
  postDocumentId: string;
  viewer: Viewer;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);

  const canDelete =
    viewer && (viewer.canModerate || viewer.id === comment.author?.id);

  const remove = async () => {
    if (!window.confirm('Delete this comment? Replies to it go too.')) return;

    setBusy(true);

    try {
      await fetch(`/api/blog/comments/${comment.documentId}`, { method: 'DELETE' });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-text">{comment.author?.username ?? 'Deleted user'}</span>
        <span className="microlabel">{timeAgo(comment.createdAt)}</span>
        {comment.editedAt ? <span className="microlabel">edited</span> : null}
      </header>

      <p className="whitespace-pre-wrap text-text-muted">{comment.body}</p>

      <div className="flex items-center gap-3">
        {viewer ? (
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
          postDocumentId={postDocumentId}
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
                postDocumentId={postDocumentId}
                viewer={viewer}
                onChanged={onChanged}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

function CommentForm({
  postDocumentId,
  parentId,
  placeholder = 'Add to the discussion',
  onPosted,
}: {
  postDocumentId: string;
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
      const response = await fetch(`/api/blog/${postDocumentId}/comments`, {
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
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor={`comment-${parentId ?? 'root'}`} className="sr-only">
        {placeholder}
      </label>

      <textarea
        id={`comment-${parentId ?? 'root'}`}
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
          {parentId ? 'Reply' : 'Post comment'}
        </Button>
        <span className="microlabel">{body.length} / 2000</span>
      </div>
    </form>
  );
}
