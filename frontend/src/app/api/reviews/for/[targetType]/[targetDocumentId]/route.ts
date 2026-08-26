import { NextResponse } from 'next/server';
import { strapiFetchOrNull } from '@/lib/strapi';

/**
 * GET /api/reviews/for/:targetType/:targetDocumentId
 *
 * Under a static `for` segment because the sibling delete route is `/api/reviews/[id]`,
 * and Next refuses two different slug names at the same path position.
 *
 * Public on the backend, but forwarded with the session anyway: the response carries the
 * caller's own review under `mine`, which is what lets the form open as an edit rather than
 * letting somebody write a second one by accident.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ targetType: string; targetDocumentId: string }> }
) {
  const { targetType, targetDocumentId } = await params;

  const result = await strapiFetchOrNull<{ data: unknown }>(
    `/reviews/${encodeURIComponent(targetType)}/${encodeURIComponent(targetDocumentId)}`,
    { cache: 'no-store' }
  );

  return NextResponse.json(result ?? { data: null });
}
