import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/** GET the thread (public); POST a comment or a reply (signed in). */
export async function GET(_request: Request, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;

  try {
    const result = await strapiFetch<unknown>(`/comments/post/${postId}`, { auth: false });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ data: [], meta: { total: 0 } });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;

  let payload: { body?: string; parentId?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  if (!payload.body?.trim()) {
    return NextResponse.json({ error: 'A comment cannot be empty' }, { status: 400 });
  }

  try {
    const result = await strapiFetch<unknown>('/comments', {
      method: 'POST',
      body: {
        postDocumentId: postId,
        body: payload.body,
        parentId: payload.parentId,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof StrapiError) {
      const message =
        error.status === 401 || error.status === 403
          ? 'Sign in to join the discussion.'
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not post that.' }, { status: 502 });
  }
}
