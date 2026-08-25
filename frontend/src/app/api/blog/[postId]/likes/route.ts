import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/** GET the count and whether the caller liked it; POST to toggle. */
export async function GET(_request: Request, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;

  try {
    const result = await strapiFetch<unknown>(`/post-likes/post/${postId}`);
    return NextResponse.json(result);
  } catch {
    // A failed count should not break the article around it.
    return NextResponse.json({ data: { count: 0, liked: false } });
  }
}

export async function POST(_request: Request, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;

  try {
    const result = await strapiFetch<unknown>('/post-likes/toggle', {
      method: 'POST',
      body: { postDocumentId: postId },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StrapiError) {
      const message =
        error.status === 401 || error.status === 403
          ? 'Sign in to like this post.'
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not save that.' }, { status: 502 });
  }
}
