import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * POST /api/progress   body: { lessonId, completed }
 *
 * A pass-through to Strapi's `/lesson-progresses/complete` and `/uncomplete`, so the
 * browser can record progress without ever holding the JWT.
 *
 * The response carries the recomputed course progress from the backend rather than a
 * number this layer worked out, so what the UI shows is the same value a page reload
 * would produce.
 */
export async function POST(request: Request) {
  let payload: { lessonId?: string; completed?: boolean };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  if (!payload.lessonId) {
    return NextResponse.json({ error: 'A lesson id is required' }, { status: 400 });
  }

  const path =
    payload.completed === false
      ? '/lesson-progresses/uncomplete'
      : '/lesson-progresses/complete';

  try {
    const result = await strapiFetch<{ data: unknown }>(path, {
      method: 'POST',
      body: { lessonId: payload.lessonId },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StrapiError) {
      const message =
        error.status === 403
          ? 'You must be enrolled in this course to track progress.'
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not save your progress.' }, { status: 502 });
  }
}
