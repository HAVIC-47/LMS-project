import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import { isAdmin, isContentManager, type AuthUser } from '../../../utils/permissions';
import { denyIfCourseRestricted } from '../../../utils/access';
import { isEnrolled } from '../../../utils/resolve';
import { notify } from '../../../utils/notify';

/**
 * Ratings and reviews, on courses.
 *
 * Posts had ratings briefly and no longer do. A blog post already carries two signals — a
 * like and a comment thread — and a third, finer-grained one asked readers to score an
 * article out of five for no clear purpose. Courses are the thing somebody chooses between,
 * so that is where a rating earns its place.
 *
 * `targetType` survives the removal rather than being collapsed into a `course` relation.
 * The column is the seam that would let another rateable thing exist later, and a relation
 * would bind to one of the two rows Draft and Publish keeps per document — the same trap
 * comments and likes avoid.
 *
 * Only enrolled students may rate. A rating from somebody who never took the course is not
 * social proof, it is noise, and a catalog whose stars can be set by anyone with an account
 * is worth less than no stars at all. That also excludes staff by construction, which is
 * intended: an instructor rating their own course is not a review.
 *
 * One review per person per course. A second submission edits the first rather than
 * stacking, so an average cannot be walked in one direction by a single determined account.
 */

const TARGETS = ['course'] as const;
type Target = (typeof TARGETS)[number];

type ReviewRow = {
  id: number;
  documentId: string;
  rating: number;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  author?: {
    id: number;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
};

const toPublicReview = (row: ReviewRow) => ({
  documentId: row.documentId,
  rating: row.rating,
  body: row.body,
  createdAt: row.createdAt,
  editedAt: row.editedAt,
  author: row.author
    ? {
        id: row.author.id,
        username: row.author.username,
        displayName: row.author.displayName ?? null,
        avatarUrl: row.author.avatarUrl ?? null,
      }
    : null,
});

/** Rounded to one decimal, because two implies a precision five stars do not have. */
const summarise = (rows: { rating: number }[]) => {
  const counts = [0, 0, 0, 0, 0];

  for (const row of rows) {
    const index = Math.min(5, Math.max(1, Math.round(row.rating))) - 1;
    counts[index] += 1;
  }

  return {
    count: rows.length,
    average:
      rows.length === 0
        ? 0
        : Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length) * 10) / 10,
    distribution: { 1: counts[0], 2: counts[1], 3: counts[2], 4: counts[3], 5: counts[4] },
  };
};

export default factories.createCoreController('api::review.review', ({ strapi }) => ({
  /**
   * GET /api/reviews/:targetType/:targetDocumentId
   *
   * Public. Returns the ratings plus the caller's own if they have one, so the form opens
   * pre-filled instead of letting somebody write a second review by accident.
   */
  async forTarget(ctx) {
    const targetType = String(ctx.params.targetType ?? '') as Target;
    const targetDocumentId = String(ctx.params.targetDocumentId ?? '');

    if (!TARGETS.includes(targetType) || !targetDocumentId) {
      return ctx.badRequest('A valid target type and id are required');
    }

    const rows = (await strapi.db.query('api::review.review').findMany({
      where: { targetType, targetDocumentId },
      populate: { author: true },
      orderBy: { createdAt: 'desc' },
    })) as ReviewRow[];

    const user = ctx.state.user as AuthUser | undefined;
    const mine = user ? rows.find((row) => row.author?.id === user.id) : undefined;

    return {
      data: {
        ...summarise(rows),
        reviews: rows.map(toPublicReview),
        mine: mine ? toPublicReview(mine) : null,
      },
    };
  },

  /**
   * POST /api/reviews   body: { targetType, targetDocumentId, rating, body }
   *
   * Creates or updates the caller's own review. Authorship comes from the token; a body
   * carrying an author is ignored, exactly as it is for comments and courses.
   */
  async submit(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const payload = (body.data ?? body) as Record<string, unknown>;

    const targetType = String(payload.targetType ?? '') as Target;
    const targetDocumentId = String(payload.targetDocumentId ?? '');
    const rating = Number(payload.rating);
    const text = typeof payload.body === 'string' ? payload.body.trim().slice(0, 1500) : '';

    if (!TARGETS.includes(targetType) || !targetDocumentId) {
      return ctx.badRequest('A valid target type and id are required');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return ctx.badRequest('rating must be a whole number from 1 to 5');
    }

    {
      if (denyIfCourseRestricted(ctx)) return;

      const course = await strapi.db.query('api::course.course').findOne({
        where: { documentId: targetDocumentId },
        populate: { owner: true },
      });

      if (!course) return ctx.notFound('Course not found');

      // Enrollment is the qualification, which also excludes staff by construction: an
      // instructor rating their own course is not a review, and letting them rate a
      // colleague's turns a catalog signal into an internal argument.
      if (!(await isEnrolled(strapi, user.id, course.id))) {
        return ctx.forbidden('Only students enrolled in this course can review it');
      }

      if (course.owner) {
        await notify(strapi as Core.Strapi, {
          recipientId: course.owner.id,
          actorId: user.id,
          type: 'course-reviewed',
          title: `${user.username} rated ${course.title} ${rating}/5`,
          href: `/courses/${course.slug}`,
        });
      }
    }

    const existing = await strapi.db.query('api::review.review').findOne({
      where: { targetType, targetDocumentId, author: { id: user.id } },
    });

    if (existing) {
      await strapi.db.query('api::review.review').update({
        where: { id: existing.id },
        data: { rating, body: text || null, editedAt: new Date().toISOString() },
      });

      return { data: { updated: true } };
    }

    await strapi.documents('api::review.review').create({
      data: {
        rating,
        body: text || undefined,
        targetType,
        targetDocumentId,
        author: user.id,
      },
    });

    ctx.status = 201;
    return { data: { created: true } };
  },

  /**
   * DELETE /api/reviews/:id
   *
   * Your own, always. An admin or content manager may remove any, for the same reason they
   * can remove any comment — but there is no edit-anyone route, because rewriting somebody's
   * rating is worse than removing it.
   */
  async remove(ctx) {
    const user = ctx.state.user as AuthUser;

    const review = await strapi.db.query('api::review.review').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true },
    });

    if (!review) return ctx.notFound('Review not found');

    const owns = review.author?.id === user.id;

    if (!owns && !isAdmin(user) && !isContentManager(user)) {
      return ctx.forbidden('You can only delete your own review');
    }

    await strapi.db.query('api::review.review').delete({ where: { id: review.id } });

    return { data: { deleted: true } };
  },
}));
