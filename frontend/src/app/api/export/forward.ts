import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, STRAPI_URL } from '@/lib/strapi';

/**
 * Forwards a CSV download from Strapi, attaching the session token server-side.
 *
 * `strapiFetch` is not used because it parses JSON; a CSV body has to travel through
 * untouched. The `Content-Disposition` header is copied from the upstream response rather
 * than rebuilt here, so the filename is decided in one place — beside the query that
 * produced the data.
 *
 * No permission logic. Strapi decides whether this caller may export, exactly as it would
 * for a direct request; a 403 upstream becomes a 403 here.
 */
export async function forwardCsv(path: string): Promise<Response> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Sign in to export.' }, { status: 401 });
  }

  const upstream = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: upstream.status === 403 ? 'You cannot export this.' : 'Export failed.' },
      { status: upstream.status }
    );
  }

  const body = await upstream.text();

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ?? 'attachment; filename="export.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
