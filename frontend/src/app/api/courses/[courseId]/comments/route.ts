import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * The course discussion thread.
 *
 * GET is public -- the course page is public, and a discussion you cannot read until you
 * enroll cannot help you decide whether to enroll. POST needs a session, and the JWT never
 * leaves this server: it is read from the httpOnly cookie by `strapiFetch`.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await ctx.params;

  try {
    const result = await strapiFetch<unknown>(`/course-comments/course/${courseId}`, {
      auth: false,
    });
    return NextResponse.json(result);
  } catch {
    // An empty thread is a better failure than an error card on an otherwise fine page.
    return NextResponse.json({ data: [], meta: { total: 0 } });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await ctx.params;

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
    const result = await strapiFetch<unknown>('/course-comments', {
      method: 'POST',
      body: {
        courseDocumentId: courseId,
        body: payload.body,
        parentId: payload.parentId,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof StrapiError) {
      // 403 here is usually the reply rule rather than a missing session, and Strapi's
      // message says which -- so it is passed through instead of being replaced with a
      // generic "sign in" that would be wrong and confusing for a signed-in student.
      const message =
        error.status === 401 ? 'Sign in to join the discussion.' : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not post that.' }, { status: 502 });
  }
}
