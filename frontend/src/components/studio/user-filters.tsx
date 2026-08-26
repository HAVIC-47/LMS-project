'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { ROLE_LABELS, ROLES, type RoleType } from '@/lib/types';

/**
 * Search and filters for the admin user list.
 *
 * State lives in the URL rather than in this component. That makes a filtered view
 * linkable and survivable across a refresh, and it means the *server* does the filtering:
 * changing a parameter re-runs the page, which re-runs the query. Holding it locally would
 * mean shipping the entire user table to the browser on every load just so it could hide
 * most of it.
 *
 * `useTransition` keeps the current rows on screen while the new ones are fetched, so
 * typing does not blank the table between keystrokes.
 */

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All roles' },
  ...Object.values(ROLES).map((role) => ({
    value: role,
    label: ROLE_LABELS[role as RoleType],
  })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'unconfirmed', label: 'Unconfirmed' },
];

export function UserFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentSearch = params.get('search') ?? '';
  const currentRole = params.get('role') ?? '';
  const currentStatus = params.get('status') ?? '';

  const [search, setSearch] = useState(currentSearch);

  // Keeps the input honest when the URL changes from somewhere else — the Clear button,
  // or the back button. Without it the field would keep showing a term no longer applied.
  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const apply = (next: Record<string, string>) => {
    const query = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      // An empty value is removed rather than written as `?role=`, so a cleared filter
      // leaves the URL exactly as it was before it was ever set.
      if (value) query.set(key, value);
      else query.delete(key);
    }

    startTransition(() => {
      router.replace(query.size > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  /**
   * Debounced, because every keystroke would otherwise be a request. 300ms is long enough
   * to collapse a typed word into one query and short enough that the list feels live.
   */
  useEffect(() => {
    if (search === currentSearch) return;

    const timer = setTimeout(() => apply({ search }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = Boolean(currentSearch || currentRole || currentStatus);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <MagnifyingGlassIcon
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-subtle"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
            aria-label="Search users by name or email"
            className="h-11 w-full rounded-input border border-line-strong bg-surface-raised pl-10 pr-4 text-base text-text placeholder:text-text-subtle focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />
        </div>

        <Select
          label="Role"
          value={currentRole}
          options={ROLE_OPTIONS}
          onChange={(value) => apply({ role: value })}
        />

        <Select
          label="Status"
          value={currentStatus}
          options={STATUS_OPTIONS}
          onChange={(value) => apply({ status: value })}
        />

        {filtered ? (
          <button
            type="button"
            onClick={() => apply({ search: '', role: '', status: '' })}
            className="flex h-11 cursor-pointer items-center gap-1.5 rounded-control px-3 text-sm text-text-muted transition-colors duration-200 hover:bg-shell hover:text-text"
          >
            <XIcon size={14} aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      <p
        // `aria-live` so a screen reader hears the count change: the visual feedback for a
        // filter is the table shrinking, which is not announced on its own.
        aria-live="polite"
        className={cn(
          'text-sm transition-opacity duration-200',
          pending ? 'text-text-subtle opacity-60' : 'text-text-muted'
        )}
      >
        {total} {total === 1 ? 'user' : 'users'}
        {filtered ? ' match these filters' : ''}
      </p>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-input border border-line-strong bg-surface-raised px-3 text-sm text-text focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
