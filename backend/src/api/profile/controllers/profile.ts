import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';

/**
 * Public profiles.
 *
 * This API has no content type: it is a read model over the user table plus whatever that
 * user has authored. It exists as a custom endpoint rather than as a `users` read for one
 * specific reason — no role in this application is granted
 * `plugin::users-permissions.user.find`, and that is deliberate. The user collection holds
 * password hashes and reset tokens, and the content API's field selection is a query
 * parameter, so opening `find` would mean trusting a query string not to ask for them.
 *
 * The consequence is that the shape below is the *only* shape a profile is ever returned
 * in. Nothing is spread from the row; every field is named. Adding a private column to the
 * user table can therefore never leak it here by accident.
 *
 * Visibility follows one rule: **published work is public, drafts and contact details are
 * not.** A visitor sees what someone has put into the world. Only the account holder sees
 * their own draft counts, their email, or their learning progress.
 */

const USER = 'plugin::users-permissions.user';

type UserRow = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  createdAt: string;
  role?: { type: string; name: string } | null;
};

/** Trimmed, or null — an empty string in the database is worse than an absent value. */
const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, max);
};

/**
 * A website is rendered as a link, so an unchecked value here is a stored XSS vector:
 * `javascript:...` in an href executes on click. Only http and https survive.
 */
const cleanWebsite = (value: unknown): string | null => {
  const raw = clean(value, 200);
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

/**
 * The avatar is rendered in an `<img src>`, and the same reasoning applies: a `data:` or
 * `javascript:` URL there is a vector. Relative paths are allowed because that is what an
 * upload returns when the backend serves its own files.
 */
const cleanAvatarUrl = (value: unknown): string | null => {
  const raw = clean(value, 500);
  if (!raw) return null;

  if (raw.startsWith('/')) return raw;

  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /api/profiles/:username
   *
   * Public. `ctx.state.user` is populated when a valid token happens to be attached, and
   * is simply absent otherwise — which is what makes the self-only sections conditional
   * rather than a separate endpoint.
   */
  async show(ctx: Context) {
    const username = String(ctx.params.username ?? '').trim();

    if (!username) return ctx.badRequest('A username is required');

    const user: UserRow | null = await strapi.db.query(USER).findOne({
      where: { username },
      populate: { role: true },
    });

    if (!user) return ctx.notFound('No such profile');

    const viewer = ctx.state.user as { id?: number } | undefined;
    const isSelf = Boolean(viewer?.id && viewer.id === user.id);

    // ---- authored courses -------------------------------------------------------------
    const ownedCourses = await strapi.db.query('api::course.course').findMany({
      where: { owner: { id: user.id } },
      select: ['id', 'documentId', 'title', 'slug', 'description', 'level', 'coverImageUrl', 'isPublished'],
      orderBy: { createdAt: 'desc' },
    });

    const publishedCourses = ownedCourses.filter((course) => course.isPublished);
    const ownedIds = ownedCourses.map((course) => course.id);

    // Counted with `course.id.$in` rather than by filtering through `course.owner`. A
    // filter path that walks into the user collection is rejected outright by the content
    // API for exactly the reason at the top of this file, and the same shape is kept here
    // so both paths stay consistent.
    const [lessonCount, quizCount, enrollmentRows] = ownedIds.length
      ? await Promise.all([
          strapi.db.query('api::lesson.lesson').count({ where: { course: { id: { $in: ownedIds } } } }),
          strapi.db.query('api::quiz.quiz').count({ where: { course: { id: { $in: ownedIds } } } }),
          strapi.db.query('api::enrollment.enrollment').findMany({
            where: { course: { id: { $in: ownedIds } } },
            populate: { student: true },
          }),
        ])
      : [0, 0, []];

    // One person enrolled in three of their courses is one student, not three.
    const distinctStudents = new Set(
      (enrollmentRows as { student?: { id: number } | null }[])
        .map((row) => row.student?.id)
        .filter((id): id is number => typeof id === 'number')
    );

    // Lesson counts per course, so the cards on a profile match the ones in the catalog.
    const lessonsPerCourse = new Map<number, number>();

    if (ownedIds.length) {
      const lessons = await strapi.db.query('api::lesson.lesson').findMany({
        where: { course: { id: { $in: ownedIds } } },
        populate: { course: true },
      });

      for (const lesson of lessons as { course?: { id: number } | null }[]) {
        const id = lesson.course?.id;
        if (typeof id !== 'number') continue;
        lessonsPerCourse.set(id, (lessonsPerCourse.get(id) ?? 0) + 1);
      }
    }

    // ---- authored posts ---------------------------------------------------------------
    /**
     * Draft & Publish keeps a draft row *and* a published row per document, so counting
     * rows double-counts everything that has been published. Group by documentId and
     * treat a document as published if any of its rows carries a `publishedAt`.
     */
    const postRows = await strapi.db.query('api::blog-post.blog-post').findMany({
      where: { author: { id: user.id } },
      select: ['documentId', 'title', 'slug', 'excerpt', 'coverImageUrl', 'publishedAt', 'createdAt'],
      orderBy: { createdAt: 'desc' },
    });

    type PostRow = {
      documentId: string;
      title: string;
      slug: string;
      excerpt: string | null;
      coverImageUrl: string | null;
      publishedAt: string | null;
      createdAt: string;
    };

    const documents = new Map<string, PostRow>();

    for (const row of postRows as PostRow[]) {
      const existing = documents.get(row.documentId);
      // Prefer the published row, so the listing shows live titles rather than draft edits.
      if (!existing || (!existing.publishedAt && row.publishedAt)) {
        documents.set(row.documentId, row);
      }
    }

    const allPosts = [...documents.values()];
    const livePosts = allPosts.filter((post) => post.publishedAt);

    // ---- learning (self only) ---------------------------------------------------------
    let learning: Record<string, number> | null = null;

    if (isSelf) {
      const [enrolled, completed, attempts] = await Promise.all([
        strapi.db.query('api::enrollment.enrollment').count({ where: { student: { id: user.id } } }),
        strapi.db
          .query('api::lesson-progress.lesson-progress')
          .count({ where: { student: { id: user.id }, completed: true } }),
        strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
          where: { student: { id: user.id } },
          select: ['passed'],
        }),
      ]);

      learning = {
        enrolledCourses: enrolled,
        lessonsCompleted: completed,
        quizzesTaken: attempts.length,
        quizzesPassed: (attempts as { passed: boolean }[]).filter((a) => a.passed).length,
      };
    }

    ctx.body = {
      data: {
        username: user.username,
        displayName: user.displayName ?? null,
        bio: user.bio ?? null,
        avatarUrl: user.avatarUrl ?? null,
        website: user.website ?? null,
        role: user.role?.type ?? null,
        roleName: user.role?.name ?? null,
        joinedAt: user.createdAt,
        isSelf,
        // Only ever to the account holder. A profile page is public; an address is not.
        email: isSelf ? user.email : null,

        teaching: {
          publishedCourses: publishedCourses.length,
          // A visitor has no business knowing how many unpublished drafts someone is
          // sitting on, so the totals collapse to the public number unless it is you.
          totalCourses: isSelf ? ownedCourses.length : publishedCourses.length,
          lessons: lessonCount,
          quizzes: quizCount,
          students: distinctStudents.size,
          courses: (isSelf ? ownedCourses : publishedCourses).map((course) => ({
            documentId: course.documentId,
            title: course.title,
            slug: course.slug,
            description: course.description,
            level: course.level,
            coverImageUrl: course.coverImageUrl,
            isPublished: course.isPublished,
            lessonCount: lessonsPerCourse.get(course.id) ?? 0,
          })),
        },

        writing: {
          publishedPosts: livePosts.length,
          totalPosts: isSelf ? allPosts.length : livePosts.length,
          draftPosts: isSelf ? allPosts.length - livePosts.length : 0,
          posts: (isSelf ? allPosts : livePosts).map((post) => ({
            documentId: post.documentId,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            coverImageUrl: post.coverImageUrl,
            publishedAt: post.publishedAt,
            isPublished: Boolean(post.publishedAt),
          })),
        },

        learning,
      },
    };
  },

  /**
   * PUT /api/profiles/me
   *
   * The identity comes from the token and nothing else. There is no `:id` on this route by
   * design — an endpoint that takes the target user from the request body or the URL is
   * one missing ownership check away from letting anyone edit anyone.
   *
   * Only four fields are writable. Role, email, username, `confirmed` and `blocked` are
   * all absent from the pick list, so a crafted body cannot reach them.
   */
  async updateMe(ctx: Context) {
    const viewer = ctx.state.user as { id?: number } | undefined;

    if (!viewer?.id) return ctx.unauthorized('You must be logged in');

    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const payload = (body.data ?? body) as Record<string, unknown>;

    const data: Record<string, string | null> = {};

    if ('displayName' in payload) data.displayName = clean(payload.displayName, 60);
    if ('bio' in payload) data.bio = clean(payload.bio, 400);
    if ('website' in payload) data.website = cleanWebsite(payload.website);

    if ('avatarUrl' in payload) {
      const avatarUrl = cleanAvatarUrl(payload.avatarUrl);

      // Distinguish "clear my avatar" from "this value was rejected". An empty string is
      // an intentional clear; a non-empty value that failed validation is an error worth
      // reporting rather than silently discarding.
      if (avatarUrl === null && clean(payload.avatarUrl, 500) !== null) {
        return ctx.badRequest('The image address must be an http(s) URL.');
      }

      data.avatarUrl = avatarUrl;
    }

    if (Object.keys(data).length === 0) {
      return ctx.badRequest('Nothing to update');
    }

    await strapi.db.query(USER).update({ where: { id: viewer.id }, data });

    const updated: UserRow = await strapi.db.query(USER).findOne({
      where: { id: viewer.id },
      populate: { role: true },
    });

    ctx.body = {
      data: {
        username: updated.username,
        displayName: updated.displayName ?? null,
        bio: updated.bio ?? null,
        avatarUrl: updated.avatarUrl ?? null,
        website: updated.website ?? null,
        role: updated.role?.type ?? null,
      },
    };
  },
});
