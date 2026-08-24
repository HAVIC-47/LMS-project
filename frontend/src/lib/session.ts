import 'server-only';

import { cookies } from 'next/headers';
import { SESSION_COOKIE, strapiFetchOrNull } from './strapi';
import { ROLES, type RoleType, type SessionUser } from './types';

/**
 * Session handling.
 *
 * The Strapi JWT lives in an httpOnly cookie set by our own route handlers. Compared with
 * keeping it in `localStorage`:
 *
 *   - `httpOnly` means no script on the page can read it, so an XSS bug cannot exfiltrate
 *     the session.
 *   - `sameSite: 'lax'` blocks the cookie on cross-site POSTs, which covers the common CSRF
 *     shape without needing a token round-trip.
 *   - It is sent automatically with requests to this origin, so `proxy.ts` can gate routes
 *     before a page ever renders.
 */

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Secure cookies require HTTPS, which localhost is not. Vercel always is.
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SEVEN_DAYS_IN_SECONDS,
};

/** Shape returned by `GET /api/users/me?populate=role` on the backend. */
type StrapiMe = {
  id: number;
  username: string;
  email: string;
  role?: { type?: string } | null;
};

const asRole = (value: string | undefined | null): RoleType | null => {
  const known = Object.values(ROLES) as string[];
  return value && known.includes(value) ? (value as RoleType) : null;
};

/**
 * Resolves the signed-in user, or null.
 *
 * The role is always re-read from the backend rather than trusted from the cookie. If an
 * admin demotes somebody mid-session, the next page load reflects it - a role baked into a
 * client-side token would stay stale until the token expired.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();

  if (!store.get(SESSION_COOKIE)?.value) {
    return null;
  }

  const me = await strapiFetchOrNull<StrapiMe>('/users/me?populate=role');

  if (!me) {
    return null;
  }

  return {
    id: me.id,
    username: me.username,
    email: me.email,
    role: asRole(me.role?.type),
  };
}

export const isAdmin = (user: SessionUser | null) => user?.role === ROLES.ADMIN;
export const isContentManager = (user: SessionUser | null) => user?.role === ROLES.CONTENT_MANAGER;
export const isInstructor = (user: SessionUser | null) => user?.role === ROLES.INSTRUCTOR;
export const isStudent = (user: SessionUser | null) => user?.role === ROLES.STUDENT;

/** Anyone who authors content rather than consuming it. */
export const isStaff = (user: SessionUser | null) =>
  isAdmin(user) || isContentManager(user) || isInstructor(user);

/** Where a given role lands after signing in. */
export function homeRouteForRole(role: RoleType | null): string {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.CONTENT_MANAGER:
    case ROLES.INSTRUCTOR:
      return '/studio';
    case ROLES.STUDENT:
      return '/my-courses';
    default:
      return '/';
  }
}
