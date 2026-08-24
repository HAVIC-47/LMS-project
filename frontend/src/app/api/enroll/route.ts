import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * POST /api/enroll   body: { courseId }
 *
 * A thin pass-through to Strapi's `/enrollments/enroll`, which exists so the browser can
 * enroll without ever holding the JWT: `strapiFetch` reads it from the httpOnly cookie on
 * this side.
 *
 * No permission logic lives here. Strapi decides whether the caller is a student, whether
 * the course is published, and whether they are already enrolled. This handler just
 * translates the outcome into something the UI can render.
 */
export async function POST(request: Request) {
  let payload: { courseId?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  if (!payload.courseId) {
    return NextResponse.json({ error: 'A course id is required' }, { status: 400 });
  }

  try {
    const result = await strapiFetch<{ data: unknown }>('/enrollments/enroll', {
      method: 'POST',
      body: { courseId: payload.courseId },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof StrapiError) {
      const message =
        error.status === 409
          ? 'You are already enrolled in this course.'
          : error.status === 403
            ? 'Only student accounts can enroll in courses.'
            : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not enroll you right now.' }, { status: 502 });
  }
}
