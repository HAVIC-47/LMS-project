import 'server-only';

import { redirect } from 'next/navigation';
import { getSessionUser } from './session';
import type { RoleType, SessionUser } from './types';

/**
 * Role guards for Server Components.
 *
 * `proxy.ts` only established that a cookie exists. These run inside the route-group
 * layouts and are where a role is actually checked on the frontend.
 *
 * They are a UX layer, not a security layer. Every one of these decisions is made again by
 * Strapi on the request that follows, using its own policies and ownership checks. If this
 * file were deleted entirely, a student navigating to /admin would see an empty shell and
 * a string of 403s rather than any real data.
 */

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function requireRole(allowed: RoleType[]): Promise<SessionUser> {
  const user = await requireUser();

  if (!user.role || !allowed.includes(user.role)) {
    // 403 rather than a redirect loop: the visitor is signed in, they are simply not
    // allowed here, and telling them so is more useful than bouncing them silently.
    redirect('/forbidden');
  }

  return user;
}
