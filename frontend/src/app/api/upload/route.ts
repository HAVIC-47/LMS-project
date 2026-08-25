import { NextResponse } from 'next/server';
import { SESSION_COOKIE, STRAPI_URL } from '@/lib/strapi';
import { cookies } from 'next/headers';

/**
 * POST /api/upload
 *
 * Uploads one image to Strapi and returns the URL to store on the record.
 *
 * The file cannot go straight to Strapi from the browser, because the browser has no
 * token: it goes through here so the JWT can be attached server-side, exactly like every
 * other write.
 *
 * `strapiFetch` is not used because that helper serialises JSON. A multipart body must be
 * streamed through unchanged, so the request is made directly.
 */

/** Anything not on this list is refused before it reaches the backend. */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

const MAX_BYTES = 5 * 1024 * 1024;

type UploadedFile = { url?: string; mime?: string; name?: string };

export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Sign in to upload an image.' }, { status: 401 });
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a file upload.' }, { status: 400 });
  }

  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file was attached.' }, { status: 400 });
  }

  // Checked here as well as on the backend. Rejecting a 40MB file before it is forwarded
  // saves the round trip, and the type check keeps a renamed executable from being handed
  // to the upload plugin at all.
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Images only: JPEG, PNG, WebP, AVIF or GIF.' },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Images must be under 5MB.' }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.append('files', file, file.name);

  try {
    // No Content-Type header is set on purpose: fetch derives it from the FormData along
    // with the multipart boundary, and setting it by hand breaks the boundary.
    const response = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const message =
        (detail as { error?: { message?: string } } | null)?.error?.message ??
        'The upload was refused.';

      return NextResponse.json(
        { error: response.status === 403 ? 'Your role cannot upload images.' : message },
        { status: response.status }
      );
    }

    // Strapi answers with an array, one entry per file. One file in, one URL out.
    const uploaded = (await response.json()) as UploadedFile[];
    const first = Array.isArray(uploaded) ? uploaded[0] : null;

    if (!first?.url) {
      return NextResponse.json({ error: 'The upload returned no file.' }, { status: 502 });
    }

    // Strapi returns a path relative to its own origin for local storage. Absolute it so
    // the browser requests it from the backend rather than from the Next server.
    const url = first.url.startsWith('http') ? first.url : `${STRAPI_URL}${first.url}`;

    return NextResponse.json({ data: { url, name: first.name ?? file.name } });
  } catch {
    return NextResponse.json({ error: 'Could not reach the upload service.' }, { status: 502 });
  }
}
