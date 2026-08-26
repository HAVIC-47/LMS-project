'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

/**
 * Search and filters, driven by the URL.
 *
 * One component for every list in the product — the catalog, the blog, both studio lists,
 * the admin user table and the course cohort — because they were all going to grow the
 * same three controls and then drift apart in a dozen small ways.
 *
 * State lives in `searchParams`, not in this component. That buys three things at once:
 * a filtered view is linkable and survives a refresh, the back button steps through
 * filters, and the *server* does the filtering, so the page stays a Server Component and
 * nothing has to be shipped to the browser to hide rows it already received.
 *
 * `useTransition` keeps the current rows on screen while the new ones are fetched, so
 * typing does not blank the list between keystrokes.
 */

export type FilterSelect = {
  /** Query-string key. */
  name: string;
  /** Accessible label; the first option doubles as the visible "no filter" text. */
  label: string;
  options: { value: string; label: string }[];
};

export function FilterBar({
  searchKey = 'q',
  searchLabel,
  searchPlaceholder,
  selects = [],
  total,
  noun,
  className,
}: {
  searchKey?: string;
  searchLabel: string;
  searchPlaceholder: string;
  selects?: FilterSelect[];
  /** How many rows the page is about to render, for the live count. */
  total: number;
  /** Singular noun; pluralised with a trailing "s". */
  noun: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentSearch = params.get(searchKey) ?? '';
  const [search, setSearch] = useState(currentSearch);

  // Keeps the input honest when the URL changes from somewhere else — the Clear button,
  // or the back button. Without it the field would keep showing a term no longer applied.
  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const apply = (next: Record<string, string>) => {
    const query = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      // An empty value is removed rather than written as `?level=`, so a cleared filter
      // leaves the URL exactly as it was before it was ever set.
      if (value) query.set(key, value);
      else query.delete(key);
    }

    startTransition(() => {
      router.replace(query.size > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  /**
   * Debounced. Every keystroke would otherwise be a navigation; 300ms is long enough to
   * collapse a typed word into one and short enough that the list still feels live.
   */
  useEffect(() => {
    if (search === currentSearch) return;

    const timer = setTimeout(() => apply({ [searchKey]: search }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const active = selects.filter((select) => params.get(select.name));
  const filtered = Boolean(currentSearch) || active.length > 0;

  const clear = () => {
    const cleared: Record<string, string> = { [searchKey]: '' };
    for (const select of selects) cleared[select.name] = '';
    apply(cleared);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
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
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="h-11 w-full rounded-input border border-line-strong bg-surface-raised pl-10 pr-4 text-base text-text placeholder:text-text-subtle focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />
        </div>

        {selects.map((select) => (
          <label key={select.name} className="flex items-center">
            <span className="sr-only">{select.label}</span>
            <select
              aria-label={select.label}
              value={params.get(select.name) ?? ''}
              onChange={(event) => apply({ [select.name]: event.target.value })}
              className="h-11 cursor-pointer rounded-input border border-line-strong bg-surface-raised px-3 text-sm text-text focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {filtered ? (
          <button
            type="button"
            onClick={clear}
            className="flex h-11 cursor-pointer items-center gap-1.5 rounded-control px-3 text-sm text-text-muted transition-colors duration-200 hover:bg-shell hover:text-text"
          >
            <XIcon size={14} aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      <p
        // `aria-live` so a screen reader hears the count change: the visual feedback for a
        // filter is the list shrinking, which is not announced on its own.
        aria-live="polite"
        className={cn(
          'text-sm transition-opacity duration-200',
          pending ? 'text-text-subtle opacity-60' : 'text-text-muted'
        )}
      >
        {total} {total === 1 ? noun : `${noun}s`}
        {filtered ? ' match' : ''}
      </p>
    </div>
  );
}
