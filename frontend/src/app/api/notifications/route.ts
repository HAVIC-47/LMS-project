import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * GET  /api/notifications        the caller's inbox
 * POST /api/notifications        { documentId } to mark one read, or {} to mark all
 *
 * A single route for both because the bell needs exactly these two operations and the
 * distinction is one field in the body.
 */
export async function GET() {
  try {
    const result = await strapiFetch<{ data: unknown; meta: { unread: number } }>(
      '/notifications/me'
    );

    return NextResponse.json(result, {
      // The bell polls this; a cached inbox would show a stale badge.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    if (error instanceof StrapiError && [401, 403].includes(error.status)) {
      // Not signed in is an empty inbox, not an error the UI should surface.
      return NextResponse.json({ data: [], meta: { unread: 0 } });
    }

    return NextResponse.json({ error: 'Could not load notifications.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let payload: { documentId?: string } = {};

  try {
    payload = await request.json();
  } catch {
    // An empty body is valid and means "mark everything read".
  }

  const path = payload.documentId
    ? `/notifications/${payload.documentId}/read`
    : '/notifications/read-all';

  try {
    const result = await strapiFetch<unknown>(path, { method: 'POST', body: {} });

    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof StrapiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not update notifications.' }, { status: 502 });
  }
}
