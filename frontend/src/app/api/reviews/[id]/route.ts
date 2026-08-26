import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * DELETE /api/reviews/:id
 *
 * Ownership and moderation rights are decided by Strapi, not here. This handler only
 * attaches the session token — it has no idea whose review this is, which is the point.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await strapiFetch<{ data: unknown }>(`/reviews/${id}`, { method: 'DELETE' });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StrapiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not delete that review.' }, { status: 502 });
  }
}
