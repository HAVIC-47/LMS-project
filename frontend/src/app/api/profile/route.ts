import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * PUT /api/profile
 *
 * Saves the signed-in user's own profile. A pass-through to Strapi's `/profiles/me`, which
 * exists so the browser can write without ever holding the JWT.
 *
 * Note what is *not* in the URL: no user id. The identity comes from the cookie on this
 * side and from the token on the backend, so there is nothing in the request a caller
 * could change to edit somebody else's profile. The field allowlist is applied on the
 * backend too — this handler forwards only the four editable keys, but that is a
 * convenience, not the security boundary.
 */

const EDITABLE = ['displayName', 'bio', 'website', 'avatarUrl'] as const;

export async function PUT(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  const body: Record<string, unknown> = {};

  for (const key of EDITABLE) {
    if (key in payload) body[key] = payload[key];
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    const result = await strapiFetch<{ data: unknown }>('/profiles/me', {
      method: 'PUT',
      body,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StrapiError) {
      const message = error.status === 401 ? 'Sign in to edit your profile.' : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not save your profile right now.' }, { status: 502 });
  }
}
