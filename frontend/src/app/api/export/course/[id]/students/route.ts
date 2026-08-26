import { forwardCsv } from '../../../forward';

/** GET /api/export/course/:id/students — the cohort of one course as CSV. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return forwardCsv(`/courses/${encodeURIComponent(id)}/students/export`);
}
