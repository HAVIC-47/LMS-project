import { factories } from '@strapi/strapi';
import { canManageCourse, isAdmin, isContentManager, type AuthUser } from '../../../utils/permissions';
import { excerpt, notify } from '../../../utils/notify';
import { denyIfCourseRestricted } from '../../../utils/access';

/**
 * Discussion on a course.
 *
 * Separate from `api::comment.comment`, which is the blog thread, for one reason that is
 * not cosmetic: **who may reply is different**. On the blog anyone signed in may answer
 * anyone. Here a student may only answer their own comment, and everyone else's answers
 * come from staff. Folding both into one type would mean a `targetType` discriminator
 * threaded through every branch of the reply check, and a single controller where the
 * rules for two features could be confused for each other.
 *
 * Like the blog thread, the course is referenced by a plain `courseDocumentId` string
 * rather than a relation: courses use Draft & Publish, which keeps a draft row and a
 * published row per document, and a relation would bind each comment to one of them and be
 * stranded when the course is published or unpublished.
 *
 * The cost of a string is no database-level cascade, so course deletion cleans up its
 * comments explicitly (see the course controller).
 */

type CommentRow = {
  id: number;
  documentId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  courseDocumentId: string;
  author?: {
    id: number;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    role?: { type?: string } | null;
  } | null;
  parent?: { id: number; documentId: string } | null;
};

/**
 * The reply rule, in one place.
 *
 *   - Admin and Content Manager may answer anyone, on any course.
 *   - An Instructor may answer anyone **on a course they own**. `canManageCourse` is the
 *     same helper that gates editing that course's lessons and quizzes, so an instructor's
 *     authority in the discussion matches their authority over the material. On somebody
 *     else's course they are an ordinary participant.
 *   - Anyone at all may answer their **own** comment, which is how a student clarifies or
 *     adds to a question they asked.
 *
 * Everything else is refused. In particular a student cannot answer another student: this
 * is a discussion where the teaching staff answer, not a forum.
 */
const canReply = (
  user: AuthUser,
  parent: { author?: { id: number } | null },
  course: { owner?: { id: number } | null }
): boolean => {
  if (canManageCourse(user, course)) return true;

  return parent.author?.id === user.id;
};

const toPublicComment = (row: CommentRow) => ({
  id: row.id,
  documentId: row.documentId,
  body: row.body,
  createdAt: row.createdAt,
  editedAt: row.editedAt,
  parentId: row.parent?.documentId ?? null,
  // An explicit projection rather than a spread: this row comes from the user table, which
  // also holds the password hash and the reset token.
  author: row.author
    ? {
        id: row.author.id,
        username: row.author.username,
        displayName: row.author.displayName ?? null,
        avatarUrl: row.author.avatarUrl ?? null,
        // Shown as a badge beside staff answers. A student reading a thread should be able
        // to tell an instructor's answer from another student's guess at a glance.
        role: row.author.role?.type ?? null,
      }
    : null,
});

export default factories.createCoreController(
  'api::course-comment.course-comment',
  ({ strapi }) => ({
    /**
     * GET /api/course-comments/course/:courseDocumentId
     *
     * The whole thread for one course, nested one level deep. Replies to replies are
     * attached to the top-level comment they descend from rather than nesting further:
     * past one level the indentation costs more readability than the hierarchy buys.
     */
    async forCourse(ctx) {
      const { courseDocumentId } = ctx.params;

      const rows = (await strapi.db.query('api::course-comment.course-comment').findMany({
        where: { courseDocumentId },
        populate: { author: { populate: { role: true } }, parent: true },
        orderBy: { createdAt: 'asc' },
      })) as CommentRow[];

      const roots = rows.filter((row) => !row.parent);
      const byParent = new Map<string, CommentRow[]>();

      for (const row of rows) {
        if (!row.parent) continue;

        const key = row.parent.documentId;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(row);
      }

      // Collapse a chain of replies onto its root so the UI only ever renders two levels.
      const collectReplies = (rootDocumentId: string): CommentRow[] => {
        const direct = byParent.get(rootDocumentId) ?? [];

        return direct.flatMap((reply) => [reply, ...collectReplies(reply.documentId)]);
      };

      return {
        data: roots.map((root) => ({
          ...toPublicComment(root),
          replies: collectReplies(root.documentId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map(toPublicComment),
        })),
        meta: { total: rows.length },
      };
    },

    /**
     * POST /api/course-comments   body: { courseDocumentId, body, parentId? }
     *
     * The author comes from the JWT, never the request, so a comment cannot be posted
     * under somebody else's name.
     */
    async create(ctx) {
      const user = ctx.state.user as AuthUser;

      if (denyIfCourseRestricted(ctx)) return;

      const payload = (ctx.request.body ?? {}) as {
        courseDocumentId?: string;
        body?: string;
        parentId?: string;
        data?: { courseDocumentId?: string; body?: string; parentId?: string };
      };

      const courseDocumentId = payload.courseDocumentId ?? payload.data?.courseDocumentId;
      const text = (payload.body ?? payload.data?.body ?? '').trim();
      const parentId = payload.parentId ?? payload.data?.parentId;

      if (!courseDocumentId) {
        return ctx.badRequest('`courseDocumentId` is required');
      }

      if (!text) {
        return ctx.badRequest('A comment cannot be empty');
      }

      if (text.length > 2000) {
        return ctx.badRequest('Comments are limited to 2000 characters');
      }

      // Only published courses accept comments. Without this a draft could be commented on
      // by anyone who learned its documentId, and the thread would appear the moment it
      // was published.
      const course = await strapi.db.query('api::course.course').findOne({
        where: { documentId: courseDocumentId, isPublished: true },
        populate: { owner: true },
      });

      if (!course) {
        return ctx.notFound('Course not found');
      }

      let parent:
        | { id: number; documentId: string; author?: { id: number; username?: string } | null }
        | null = null;

      if (parentId) {
        parent = await strapi.db.query('api::course-comment.course-comment').findOne({
          where: { documentId: parentId },
          populate: { author: true },
        });

        if (!parent) {
          return ctx.badRequest('The comment being replied to no longer exists');
        }

        // The rule this whole feature exists for. Checked on the server, after loading the
        // parent and the course, because both the parent's author and the course's owner
        // are needed to decide it -- neither can be trusted from the request.
        if (!canReply(user, parent, course)) {
          return ctx.forbidden(
            'Only the teaching staff, or the person who wrote a comment, can reply to it.'
          );
        }
      }

      const created = await strapi.documents('api::course-comment.course-comment').create({
        data: {
          body: text,
          courseDocumentId,
          author: user.id,
          parent: parent ? parent.id : null,
        },
      });

      const href = `/courses/${course.slug}`;

      // A reply notifies the person replied to; a new question notifies whoever owns the
      // course, since they are the one expected to answer it.
      if (parent) {
        await notify(strapi, {
          recipientId: parent.author?.id,
          actorId: user.id,
          type: 'reply-to-comment',
          title: `${user.username} replied to your comment`,
          body: excerpt(text),
          href,
        });
      } else {
        await notify(strapi, {
          recipientId: course.owner?.id,
          actorId: user.id,
          type: 'comment-on-course',
          title: `${user.username} commented on ${course.title}`,
          body: excerpt(text),
          href,
        });
      }

      ctx.status = 201;

      return {
        data: toPublicComment({
          ...(created as unknown as CommentRow),
          author: {
            id: user.id,
            username: user.username ?? '',
            displayName: user.displayName ?? null,
            avatarUrl: user.avatarUrl ?? null,
            role: { type: user.role?.type },
          },
          parent: parent ? { id: parent.id, documentId: parent.documentId } : null,
        }),
      };
    },

    /**
     * PUT /api/course-comments/:id
     *
     * Editing is limited to the author. Staff can remove a comment but cannot rewrite one:
     * putting words in somebody's mouth is worse than deleting them.
     */
    async update(ctx) {
      const user = ctx.state.user as AuthUser;

      const existing = await strapi.db.query('api::course-comment.course-comment').findOne({
        where: { documentId: ctx.params.id },
        populate: { author: true },
      });

      if (!existing) {
        return ctx.notFound('Comment not found');
      }

      if (existing.author?.id !== user.id) {
        return ctx.forbidden('You can only edit your own comments');
      }

      const payload = (ctx.request.body ?? {}) as { body?: string; data?: { body?: string } };
      const text = (payload.body ?? payload.data?.body ?? '').trim();

      if (!text) {
        return ctx.badRequest('A comment cannot be empty');
      }

      if (text.length > 2000) {
        return ctx.badRequest('Comments are limited to 2000 characters');
      }

      const editedAt = new Date().toISOString();

      const updated = await strapi.documents('api::course-comment.course-comment').update({
        documentId: ctx.params.id,
        data: { body: text, editedAt },
      });

      if (!updated) {
        return ctx.notFound('Comment not found');
      }

      return { data: { documentId: updated.documentId, body: text, editedAt } };
    },

    /**
     * DELETE /api/course-comments/:id
     *
     * The author, an admin or content manager, or the instructor who owns the course.
     * Replies go with their parent, otherwise the thread shows orphaned answers to a
     * question nobody can see.
     */
    async delete(ctx) {
      const user = ctx.state.user as AuthUser;

      const existing = await strapi.db.query('api::course-comment.course-comment').findOne({
        where: { documentId: ctx.params.id },
        populate: { author: true },
      });

      if (!existing) {
        return ctx.notFound('Comment not found');
      }

      const own = existing.author?.id === user.id;
      let moderator = isAdmin(user) || isContentManager(user);

      // An instructor moderates the discussion on their own course and nowhere else. The
      // course is only loaded when it might change the answer.
      if (!own && !moderator) {
        const course = await strapi.db.query('api::course.course').findOne({
          where: { documentId: existing.courseDocumentId },
          populate: { owner: true },
        });

        moderator = Boolean(course) && canManageCourse(user, course);
      }

      if (!own && !moderator) {
        return ctx.forbidden('You can only delete your own comments');
      }

      await strapi.db.query('api::course-comment.course-comment').deleteMany({
        where: { parent: { id: existing.id } },
      });

      await strapi.db.query('api::course-comment.course-comment').delete({
        where: { id: existing.id },
      });

      return { data: { deleted: true } };
    },
  })
);
