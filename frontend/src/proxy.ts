import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge gate for authenticated areas.
 *
 * In Next 16 this file is called `proxy.ts`; `middleware.ts` still works but logs a
 * deprecation warning and is scheduled for removal.
 *
 * What this does and, more importantly, what it does NOT do:
 *
 *   - It checks that a session cookie EXISTS, and bounces anonymous visitors to /login
 *     with a `next` parameter so they land where they were going.
 *   - It does NOT check roles. A Strapi JWT carries `{ id, iat, exp }` and no role claim,
 *     so establishing a role here would mean an extra request to the backend on every
 *     single navigation. Roles are checked in the route-group layouts instead, which
 *     already load the user for the page they render.
 *   - It is NOT the security boundary. A cookie that is expired, forged or belongs to a
 *     demoted user still gets past this file - and then fails at the backend, which
 *     re-checks the role on every request. This layer exists to avoid showing a signed-out
 *     visitor a dashboard shell that would only fail once its data arrived.
 */

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/my-courses',
  '/learn',
  '/studio',
  '/admin',
  '/account',
  // Editing a profile needs a session. Public profiles at /u/:username deliberately do
  // not — the whole point of them is that they can be read signed out.
  '/settings',
];

const AUTH_PAGES = ['/login', '/signup'];

const SESSION_COOKIE = 'lms_token';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !hasSession) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);

    return NextResponse.redirect(login);
  }

  // Someone already signed in has no business on the login screen. Send them to the
  // dashboard router, which forwards to the right home for their role.
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Skip static assets and the auth route handlers. The handlers must stay reachable while
   * logged out (that is how you log in) and while logged in (that is how you log out).
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
