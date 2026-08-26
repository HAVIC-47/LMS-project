import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * POST /api/reviews
 *
 * Creates or updates the caller's own rating. A pass-through, so the browser never holds
 * the JWT — and note there is no author in the body: Strapi takes it from the token, so a
 * forged one would be ignored even if this handler forwarded it.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  try {
    const result = await strapiFetch<{ data: unknown }>('/reviews', {
      method: 'POST',
      body: {
        targetType: payload.targetType,
        targetDocumentId: payload.targetDocumentId,
        rating: payload.rating,
        body: payload.body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StrapiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not save your rating.' }, { status: 502 });
  }
}
