import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * DELETE one course comment.
 *
 * No ownership logic here. Strapi decides whether the caller is the author, an admin, a
 * content manager, or the instructor who owns the course; this handler only translates the
 * outcome.
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await ctx.params;

  try {
    const result = await strapiFetch<unknown>(`/course-comments/${commentId}`, {
      method: 'DELETE',
    });
    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof StrapiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not delete that comment.' }, { status: 502 });
  }
}
