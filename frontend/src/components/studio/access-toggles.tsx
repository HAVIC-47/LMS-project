'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BooksIcon, NotePencilIcon, ProhibitIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { ManageError, setUserAccess } from '@/lib/manage';

/**
 * Blocking, and the two narrower feature restrictions.
 *
 * Three switches rather than one, because "this person should not be here" and "this person
 * is misusing the comments" are different judgements. Collapsing them into a single Block
 * would mean the only response to a bad comment is removing the account, and the only way
 * back is un-removing it.
 *
 *   Blocked — cannot sign in at all. Enforced by users-permissions itself.
 *   Courses — cannot enroll or submit a quiz attempt.
 *   Blog    — cannot comment or like.
 *
 * None of them hides anything: a restricted student still reads the course and the thread.
 * The restriction is on taking part, not on looking, and quietly removing someone's reading
 * access as a side effect of a moderation action would be a surprise.
 *
 * The switches are optimistic. Each is a boolean the server will either accept or reject
 * outright, so showing the new state immediately and rolling back on failure is honest —
 * there is no third outcome to misrepresent.
 */

type Access = {
  blocked: boolean;
  courseAccessRestricted: boolean;
  blogAccessRestricted: boolean;
};

export function AccessToggles({
  userId,
  username,
  isSelf,
  initial,
}: {
  userId: number;
  username: string;
  isSelf: boolean;
  initial: Access;
}) {
  const [access, setAccess] = useState<Access>(initial);
  const [busy, setBusy] = useState<keyof Access | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggle = async (key: keyof Access) => {
    const next = !access[key];

    // Blocking yourself locks you out of the screen that could undo it. The backend
    // refuses it too; this is here so the answer is immediate rather than a round trip.
    if (key === 'blocked' && isSelf && next) {
      setError('You cannot block your own account.');
      return;
    }

    if (key === 'blocked' && next && !window.confirm(`Block ${username}? They will not be able to sign in.`)) {
      return;
    }

    const previous = access;
    setAccess({ ...access, [key]: next });
    setBusy(key);
    setError(null);

    try {
      await setUserAccess(userId, { [key]: next });
      // The list is server-rendered, so the row's own badges only update on a refresh.
      router.refresh();
    } catch (caught) {
      setAccess(previous);
      setError(caught instanceof ManageError ? caught.message : 'Could not save that.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5" role="group" aria-label={`Access for ${username}`}>
        <Switch
          label="Blocked"
          title={`${access.blocked ? 'Unblock' : 'Block'} ${username} from signing in`}
          icon={<ProhibitIcon size={14} weight="bold" aria-hidden />}
          on={access.blocked}
          busy={busy === 'blocked'}
          tone="danger"
          onClick={() => toggle('blocked')}
        />
        <Switch
          label="Courses"
          title={`${access.courseAccessRestricted ? 'Restore' : 'Restrict'} ${username}'s course access`}
          icon={<BooksIcon size={14} aria-hidden />}
          on={access.courseAccessRestricted}
          busy={busy === 'courseAccessRestricted'}
          onClick={() => toggle('courseAccessRestricted')}
        />
        <Switch
          label="Blog"
          title={`${access.blogAccessRestricted ? 'Restore' : 'Restrict'} ${username}'s blog access`}
          icon={<NotePencilIcon size={14} aria-hidden />}
          on={access.blogAccessRestricted}
          busy={busy === 'blogAccessRestricted'}
          onClick={() => toggle('blogAccessRestricted')}
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A toggle button rather than a checkbox.
 *
 * `aria-pressed` is what makes it announce as on or off; the colour alone would not, and
 * "restricted" reading identically to "not restricted" on a screen reader is exactly the
 * kind of thing that gets a moderation screen wrong.
 */
function Switch({
  label,
  title,
  icon,
  on,
  busy,
  tone = 'accent',
  onClick,
}: {
  label: string;
  title: string;
  icon: React.ReactNode;
  on: boolean;
  busy: boolean;
  tone?: 'accent' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={on}
      title={title}
      className={cn(
        'flex h-9 cursor-pointer items-center gap-1.5 rounded-control border px-2.5 text-xs font-medium',
        'transition-colors duration-200 disabled:opacity-50',
        on
          ? tone === 'danger'
            ? 'border-danger bg-danger text-page'
            : 'border-accent bg-accent text-accent-ink-on'
          : 'border-line-strong text-text-subtle hover:border-text hover:text-text'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
