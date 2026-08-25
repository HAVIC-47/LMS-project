import { factories } from '@strapi/strapi';
import { isAdmin, isContentManager, type AuthUser } from '../../../utils/permissions';
import { excerpt, notify } from '../../../utils/notify';

/**
 * Comments on blog posts.
 *
 * The post is referenced by a plain `postDocumentId` string rather than a relation. Blog
 * posts use Draft & Publish, which stores a draft row and a published row per document; a
 * relation would bind each comment to one of those rows, and publishing or unpublishing
 * would strand it. A string keyed on the document survives both.
 *
 * The cost is no database-level cascade, so `blog-post` deletion cleans up its comments
 * explicitly (see the blog-post controller).
 */

type CommentRow = {
  id: number;
  documentId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  postDocumentId: string;
  author?: { id: number; username: string } | null;
  parent?: { id: number; documentId: string } | null;
};

const toPublicComment = (row: CommentRow) => ({
  id: row.id,
  documentId: row.documentId,
  body: row.body,
  createdAt: row.createdAt,
  editedAt: row.editedAt,
  parentId: row.parent?.documentId ?? null,
  author: row.author ? { id: row.author.id, username: row.author.username } : null,
});

export default factories.createCoreController('api::comment.comment', ({ strapi }) => ({
  /**
   * GET /api/comments/post/:postDocumentId
   *
   * The whole thread for one post, nested one level deep. Replies to replies are attached
   * to the top-level comment they descend from rather than nesting further: past one level
   * the indentation costs more readability than the hierarchy buys.
   */
  async forPost(ctx) {
    const { postDocumentId } = ctx.params;

    const rows = (await strapi.db.query('api::comment.comment').findMany({
      where: { postDocumentId },
      populate: { author: true, parent: true },
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
   * POST /api/comments   body: { postDocumentId, body, parentId? }
   *
   * The author comes from the JWT, never the request, so a comment cannot be posted under
   * somebody else's name.
   */
  async create(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as {
      postDocumentId?: string;
      body?: string;
      parentId?: string;
      data?: { postDocumentId?: string; body?: string; parentId?: string };
    };

    const postDocumentId = body.postDocumentId ?? body.data?.postDocumentId;
    const text = (body.body ?? body.data?.body ?? '').trim();
    const parentId = body.parentId ?? body.data?.parentId;

    if (!postDocumentId) {
      return ctx.badRequest('`postDocumentId` is required');
    }

    if (!text) {
      return ctx.badRequest('A comment cannot be empty');
    }

    if (text.length > 2000) {
      return ctx.badRequest('Comments are limited to 2000 characters');
    }

    // Only published posts accept comments. Without this check a draft could be commented
    // on by anyone who learned its documentId, and the thread would appear the moment it
    // was published.
    const published = await strapi.db.query('api::blog-post.blog-post').findOne({
      where: { documentId: postDocumentId, publishedAt: { $notNull: true } },
      populate: { author: true },
    });

    if (!published) {
      return ctx.notFound('Post not found');
    }

    let parent: { id: number; documentId: string; author?: { id: number } | null } | null = null;

    if (parentId) {
      parent = await strapi.db.query('api::comment.comment').findOne({
        where: { documentId: parentId },
        populate: { author: true },
      });

      if (!parent) {
        return ctx.badRequest('The comment being replied to no longer exists');
      }
    }

    const created = await strapi.documents('api::comment.comment').create({
      data: {
        body: text,
        postDocumentId,
        author: user.id,
        parent: parent ? parent.id : null,
      },
    });

    // A reply notifies the person replied to; a top-level comment notifies the post author.
    if (parent) {
      await notify(strapi, {
        recipientId: parent.author?.id,
        actorId: user.id,
        type: 'reply-to-comment',
        title: `${user.username} replied to your comment`,
        body: excerpt(text),
        href: `/blog/${published.slug}`,
      });
    } else {
      await notify(strapi, {
        recipientId: published.author?.id,
        actorId: user.id,
        type: 'comment-on-post',
        title: `${user.username} commented on ${published.title}`,
        body: excerpt(text),
        href: `/blog/${published.slug}`,
      });
    }

    ctx.status = 201;

    return {
      data: toPublicComment({
        ...(created as unknown as CommentRow),
        author: { id: user.id, username: user.username ?? '' },
        parent: parent ? { id: parent.id, documentId: parent.documentId } : null,
      }),
    };
  },

  /**
   * PUT /api/comments/:id
   *
   * Editing is limited to the author. An admin or content manager can remove a comment but
   * cannot rewrite one: putting words in somebody's mouth is worse than deleting them.
   */
  async update(ctx) {
    const user = ctx.state.user as AuthUser;

    const existing = await strapi.db.query('api::comment.comment').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true },
    });

    if (!existing) {
      return ctx.notFound('Comment not found');
    }

    if (existing.author?.id !== user.id) {
      return ctx.forbidden('You can only edit your own comments');
    }

    const body = (ctx.request.body ?? {}) as { body?: string; data?: { body?: string } };
    const text = (body.body ?? body.data?.body ?? '').trim();

    if (!text) {
      return ctx.badRequest('A comment cannot be empty');
    }

    const editedAt = new Date().toISOString();

    const updated = await strapi.documents('api::comment.comment').update({
      documentId: ctx.params.id,
      data: { body: text, editedAt },
    });

    if (!updated) {
      return ctx.notFound('Comment not found');
    }

    return { data: { documentId: updated.documentId, body: text, editedAt } };
  },

  /**
   * DELETE /api/comments/:id
   *
   * The author, or a moderator. Replies are deleted with their parent, otherwise the thread
   * would show orphaned answers to a question nobody can see.
   */
  async delete(ctx) {
    const user = ctx.state.user as AuthUser;

    const existing = await strapi.db.query('api::comment.comment').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true },
    });

    if (!existing) {
      return ctx.notFound('Comment not found');
    }

    const isModerator = isAdmin(user) || isContentManager(user);

    if (existing.author?.id !== user.id && !isModerator) {
      return ctx.forbidden('You can only delete your own comments');
    }

    await strapi.db.query('api::comment.comment').deleteMany({
      where: { parent: { id: existing.id } },
    });

    await strapi.db.query('api::comment.comment').delete({ where: { id: existing.id } });

    return { data: { deleted: true } };
  },
}));
