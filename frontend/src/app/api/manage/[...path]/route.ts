import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { StrapiError, strapiFetch } from '@/lib/strapi';

/**
 * Authenticated write proxy for the management screens.
 *
 * The browser cannot hold the JWT, so every create, update and delete has to travel
 * through this server. Writing one handler per resource would be a dozen near-identical
 * files, so this forwards a constrained set of paths instead.
 *
 * The allowlist is the point. Without it this would forward ANY path to Strapi under the
 * caller's identity, and the day a permission is opened somewhere unrelated, this route
 * would quietly expose it. Only the resources the management UI actually edits are listed,
 * and anything else is refused here before a request is made.
 *
 * This is not an authorization layer. It decides which URLs may be reached, never who may
 * reach them: Strapi re-checks the role, the ownership and the matrix on every forwarded
 * request, exactly as it would for a direct call.
 */

const ALLOWED: RegExp[] = [
  // Content the studio edits. `:id` here is a Strapi documentId.
  /^courses(\/[\w-]+)?$/,
  /^lessons(\/[\w-]+)?$/,
  /^quizzes(\/[\w-]+)?$/,
  /^questions(\/[\w-]+)?$/,
  /^blog-posts(\/[\w-]+)?$/,
  /^blog-posts\/[\w-]+\/(publish|unpublish)$/,
  // Admin panel. The role route is the one privileged write in the platform.
  /^platform\/users$/,
  /^platform\/users\/\d+\/role$/,
  // Blocking and the two feature restrictions. Admin-only on the backend, like the role
  // route beside it.
  /^platform\/users\/\d+\/access$/,
  // Removing a student from a course. Numeric because it addresses a user id, not a
  // documentId — the pattern is deliberately narrower than the `[\w-]+` used above.
  /^courses\/[\w-]+\/students\/\d+$/,
];

const isAllowed = (path: string) => ALLOWED.some((pattern) => pattern.test(path));

/**
 * Which cached reads a write invalidates.
 *
 * The public catalog and blog are fetched with `revalidate: 60` so they are not rebuilt
 * per visitor. Without this, publishing a course would leave it missing from the catalog
 * for up to a minute, and the editor would reasonably conclude that publishing is broken.
 *
 * Lessons and quizzes map to the `courses` tag because the course endpoints report lesson
 * and quiz counts, so editing one changes what the catalog shows.
 */
const TAGS_FOR: { pattern: RegExp; tags: string[] }[] = [
  { pattern: /^courses/, tags: ['courses'] },
  { pattern: /^lessons/, tags: ['courses'] },
  { pattern: /^quizzes/, tags: ['courses'] },
  { pattern: /^questions/, tags: ['courses'] },
  { pattern: /^blog-posts/, tags: ['blog'] },
];

const invalidate = (path: string) => {
  for (const entry of TAGS_FOR) {
    if (!entry.pattern.test(path)) continue;
    // `{ expire: 0 }` rather than the usual "max" profile: "max" is
    // stale-while-revalidate, which would serve the pre-publish catalog once more before
    // refreshing. An editor who just pressed Publish must see it on the next load, so the
    // entry is expired outright.
    for (const tag of entry.tags) revalidateTag(tag, { expire: 0 });
  }
};

async function forward(
  request: Request,
  params: Promise<{ path: string[] }>,
  method: 'POST' | 'PUT' | 'DELETE'
) {
  const { path } = await params;
  const joined = path.join('/');

  if (!isAllowed(joined)) {
    return NextResponse.json({ error: 'That resource cannot be edited here.' }, { status: 403 });
  }

  let body: unknown;

  if (method !== 'DELETE') {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
    }
  }

  try {
    const result = await strapiFetch<unknown>(`/${joined}`, { method, body });

    // Only after the write succeeded: dropping the cache on a failed request would make
    // every visitor pay for a rebuild that changes nothing.
    invalidate(joined);

    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof StrapiError) {
      // Strapi's own message is the useful one here: it names the field that failed
      // validation or explains which ownership rule was violated.
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not save your changes.' }, { status: 502 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(request, ctx.params, 'POST');
}

export async function PUT(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(request, ctx.params, 'PUT');
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(request, ctx.params, 'DELETE');
}
