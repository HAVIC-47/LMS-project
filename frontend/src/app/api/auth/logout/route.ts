import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/strapi';

/**
 * POST /api/auth/logout
 *
 * Clearing the cookie is the whole logout. The JWT itself stays valid until it expires,
 * which is the accepted trade of stateless tokens: there is no server-side session list to
 * revoke. A shorter `JWT_EXPIRES_IN` on the backend is the dial that tightens this.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
