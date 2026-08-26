/**
 * Filtering helpers shared by every list page.
 *
 * These run on the server, over a list that was fetched whole and cached. Pushing the
 * search into the API query instead would look more correct and be worse: the public
 * catalog and blog are cached under one tag each, and a per-term query would fragment that
 * into a cache entry for every string anybody has ever typed.
 *
 * No `server-only` marker: the cohort table filters the same way in the browser, over data
 * it already holds, and it should behave identically to the pages that do it server-side.
 */

/** Case- and accent-insensitive contains, over several fields at once. */
export function matches(term: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = normalise(term);
  if (!needle) return true;

  return fields.some((field) => normalise(field).includes(needle));
}

/**
 * Lowercased and stripped of diacritics, so searching "cafe" finds "café".
 *
 * `NFD` splits an accented character into its base plus a combining mark, which the range
 * below then removes. Without it the two strings differ by a code point the reader cannot
 * see and the search silently returns nothing.
 */
function normalise(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Reads a query parameter only if it is one of the values the page understands. */
export function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[]
): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export const SORT_LABELS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A–Z',
} as const;

export type SortKey = keyof typeof SORT_LABELS;

export const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

/**
 * Sorts by a date, or by title.
 *
 * `localeCompare` rather than `<`, so "Ångström" lands where a reader expects instead of
 * after "Z" where its code point would put it.
 */
export function sortBy<T>(
  items: T[],
  key: SortKey | null,
  read: (item: T) => { date: string | null | undefined; title: string }
): T[] {
  if (!key) return items;

  const time = (item: T) => {
    const value = read(item).date;
    return value ? new Date(value).getTime() : 0;
  };

  return [...items].sort((a, b) => {
    switch (key) {
      case 'oldest':
        return time(a) - time(b);
      case 'title':
        return read(a).title.localeCompare(read(b).title);
      default:
        return time(b) - time(a);
    }
  });
}
