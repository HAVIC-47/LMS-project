import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

/**
 * GET /api/auth/me
 *
 * Lets Client Components ask who is signed in without ever touching the token. Returns
 * `{ user: null }` rather than a 401 for a logged-out visitor, because "nobody is signed
 * in" is a normal answer on a public page, not an error.
 */
export async function GET() {
  const user = await getSessionUser();

  return NextResponse.json(
    { user },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
