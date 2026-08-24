import { NextResponse } from 'next/server';
import { sessionCookieOptions } from '@/lib/session';
import { SESSION_COOKIE, STRAPI_URL } from '@/lib/strapi';

/**
 * POST /api/auth/login
 *
 * The browser posts credentials here, not to Strapi. This handler exchanges them for a JWT
 * and puts that JWT into an httpOnly cookie, so the token exists only between this server
 * and Strapi. The response body carries the user, never the token.
 */
export async function POST(request: Request) {
  let payload: { identifier?: string; password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  const identifier = payload.identifier?.trim();
  const password = payload.password;

  if (!identifier || !password) {
    return NextResponse.json({ error: 'Email and password are both required' }, { status: 400 });
  }

  const upstream = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    // Strapi says "Invalid identifier or password" for both a wrong email and a wrong
    // password. That is deliberate: distinguishing them tells an attacker which accounts
    // exist. The message is passed through unchanged.
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      'Could not sign you in. Check your details and try again.';

    return NextResponse.json({ error: message }, { status: upstream.status === 400 ? 401 : upstream.status });
  }

  const { jwt, user } = data as {
    jwt: string;
    user: { id: number; username: string; email: string };
  };

  const response = NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email },
  });

  response.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions);

  return response;
}
