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
export async function getProfile(username: string): Promise<Profile | null> {
  if (!username) return null;

  const response = await strapiFetchOrNull<{ data: Profile }>(
    `/profiles/${encodeURIComponent(username)}`,
    // Profiles carry live counts — courses published, students enrolled — so a cached one
    // goes stale the moment its owner does anything. Cheap query, no cache.
    { cache: 'no-store' },
  );

  return response?.data ?? null;
}
