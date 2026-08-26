import {
  ArrowRightIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  UserSwitchIcon,
} from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';
import { AUDIT_LABELS, type AuditEntry } from '@/lib/api/extras';

/**
 * The audit trail.
 *
 * Read-only by construction, not by convention: the backend exposes no create, update or
 * delete route for these rows, so there is nothing for this component to offer. An audit
 * trail an administrator can quietly tidy is not one.
 *
 * A list rather than a table. Every entry already carries a written summary, and wrapping
 * one sentence in five columns makes it harder to read, not easier.
 */

const ICONS: Record<string, React.ReactNode> = {
  'role.changed': <UserSwitchIcon size={15} aria-hidden />,
  'user.blocked': <ProhibitIcon size={15} weight="bold" aria-hidden />,
  'user.unblocked': <ShieldCheckIcon size={15} aria-hidden />,
  'access.course.restricted': <ProhibitIcon size={15} aria-hidden />,
  'access.course.restored': <ShieldCheckIcon size={15} aria-hidden />,
  'access.blog.restricted': <ProhibitIcon size={15} aria-hidden />,
  'access.blog.restored': <ShieldCheckIcon size={15} aria-hidden />,
  'enrollment.removed': <UserMinusIcon size={15} aria-hidden />,
};

/** Restrictive actions read in the danger tone; restorative ones do not. */
const isRestrictive = (action: string) =>
  action === 'user.blocked' || action.endsWith('.restricted') || action === 'enrollment.removed';

/** Relative for the recent past, absolute once "3 days ago" stops being useful. */
function when(iso: string): string {
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

export function AuditTrail({ entries, total }: { entries: AuditEntry[]; total: number }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-text-muted">
        Nothing recorded yet. Changing a role, blocking an account, restricting a feature or
        removing a student from a course will all appear here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        {entries.length === total
          ? `${total} ${total === 1 ? 'entry' : 'entries'}`
          : `${entries.length} most recent of ${total}`}
      </p>

      <ol className="flex flex-col">
        {entries.map((entry) => (
          <li
            key={entry.documentId}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-3.5 last:border-b"
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-control border',
                isRestrictive(entry.action)
                  ? 'border-danger/40 bg-danger-soft text-danger'
                  : 'border-line bg-surface text-text-muted'
              )}
            >
              {ICONS[entry.action] ?? <UserSwitchIcon size={15} aria-hidden />}
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm text-text">{entry.summary}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-subtle">
                <span className="font-medium">{entry.actorLabel}</span>
                <ArrowRightIcon size={10} aria-hidden />
                <span>{entry.targetLabel}</span>
              </span>
            </span>

            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="microlabel">
                {AUDIT_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="text-xs text-text-subtle">{when(entry.createdAt)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
