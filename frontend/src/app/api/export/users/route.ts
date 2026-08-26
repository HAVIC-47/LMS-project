import { forwardCsv } from '../forward';

/**
 * GET /api/export/users
 *
 * Streams the admin user export. The query is passed straight through, so the file matches
 * whatever the table was filtered to.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.toString();

  return forwardCsv(`/platform/users/export${query ? `?${query}` : ''}`);
}
