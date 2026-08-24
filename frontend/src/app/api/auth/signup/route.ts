import { NextResponse } from 'next/server';
import { sessionCookieOptions } from '@/lib/session';
import { SESSION_COOKIE, STRAPI_URL } from '@/lib/strapi';

/**
 * POST /api/auth/signup
 *
 * Note what is NOT forwarded: a role. The backend pins new accounts to `student` through
 * the users-permissions default role, and `register.allowedFields: []` makes a `role` in
 * the body impossible to honour. Even so, only the three fields below are passed on, so
 * this layer cannot become the hole either.
 */
export async function POST(request: Request) {
  let payload: { username?: string; email?: string; password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  const username = payload.username?.trim();
  const email = payload.email?.trim();
  const password = payload.password;

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are all required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Use at least 8 characters for your password' },
      { status: 400 }
    );
  }

  const upstream = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      'Could not create your account.';

    return NextResponse.json({ error: message }, { status: upstream.status });
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
