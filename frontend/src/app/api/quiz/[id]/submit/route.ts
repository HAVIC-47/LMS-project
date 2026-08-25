import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * POST /api/quiz/:id/submit   body: { answers: [{ questionId, selectedIndex }] }
 *
 * Forwards the chosen options and returns the graded result.
 *
 * Note what is not here: any grading. The score comes back from Strapi, which holds the
 * answer key and computes it server-side. This handler could not fake a pass even if the
 * client asked it to, because it never learns which option was correct until the backend
 * says so in the response.
 *
 * `params` is a Promise in Next 15 and later.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: { answers?: { questionId: string; selectedIndex: number | null }[] };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  if (!Array.isArray(payload.answers)) {
    return NextResponse.json({ error: '`answers` must be an array' }, { status: 400 });
  }

  // Unanswered questions are dropped rather than sent as null: the grader treats a missing
  // answer and an out-of-range answer identically, and sending fewer fields keeps the
  // stored attempt tidy.
  const answers = payload.answers.filter(
    (answer) => answer && typeof answer.selectedIndex === 'number'
  );

  try {
    const result = await strapiFetch<{ data: unknown }>(`/quizzes/${id}/submit`, {
      method: 'POST',
      body: { answers },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StrapiError) {
      const message =
        error.status === 403
          ? 'You must be enrolled in this course to take its quiz.'
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not submit your answers.' }, { status: 502 });
  }
}
