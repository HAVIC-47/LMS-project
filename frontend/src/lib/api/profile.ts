import 'server-only';

import { strapiFetchOrNull } from '@/lib/strapi';
import type { Profile } from '@/lib/types';

/**
 * Reads for the profile screens.
 *
 * One endpoint, `/profiles/:username`, and it is public — an anonymous visitor gets the
 * same call as a signed-in one. What differs is the response: `strapiFetch` attaches the
 * session cookie's token when there is one, and the backend uses it to decide `isSelf`
 * and whether the private sections are populated.
 *
 * That is why there is no separate "my profile" fetcher. A second endpoint would mean two
 * shapes to keep in step, and the difference between them is exactly one boolean the
 * backend is already computing.
 */
/**
 * Path segments arrive from the router still percent-encoded, so a username containing a
 * space reaches this function as `Faisal%20Hossain`. Encoding that again produced
 * `Faisal%2520Hossain`, Strapi looked for a user literally called `Faisal%20Hossain`, found
 * none, and the profile page rendered its not-found state — for every account whose name
 * has a space in it.
 *
 * Decoding first makes the input canonical whichever form it arrives in: a value with no
 * percent sequences is returned unchanged, so this is safe to apply twice. Wrapped because
 * `decodeURIComponent` throws on a malformed sequence such as a lone `%`, and a bad URL
 * should render a missing profile rather than a server error.
 */
function canonicalUsername(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function getProfile(username: string): Promise<Profile | null> {
  if (!username) return null;

  const response = await strapiFetchOrNull<{ data: Profile }>(
    `/profiles/${encodeURIComponent(canonicalUsername(username))}`,
    // Profiles carry live counts — courses published, students enrolled — so a cached one
    // goes stale the moment its owner does anything. Cheap query, no cache.
    { cache: 'no-store' },
  );

  return response?.data ?? null;
}
