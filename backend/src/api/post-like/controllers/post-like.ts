import { factories } from '@strapi/strapi';
import type { AuthUser } from '../../../utils/permissions';
import { notify } from '../../../utils/notify';
import { denyIfBlogRestricted } from '../../../utils/access';

/**
 * Likes on blog posts.
 *
 * Same reasoning as comments: the post is referenced by `postDocumentId` rather than a
 * relation, because Draft & Publish keeps two rows per document and a relation would bind
 * the like to one of them.
 *
 * There is no numeric counter anywhere. The count is the number of rows, so it cannot
 * drift from the set of people who actually liked the post, and unliking is a delete
 * rather than a decrement that could go negative.
 */
export default factories.createCoreController('api::post-like.post-like', ({ strapi }) => ({
  /**
   * GET /api/post-likes/post/:postDocumentId
   *
   * The count, plus whether the caller is one of them. Public, so a logged-out visitor
   * sees the total with `liked: false`.
   */
  async forPost(ctx) {
    const { postDocumentId } = ctx.params;
    const user = ctx.state.user as AuthUser | undefined;

    const count = await strapi.db
      .query('api::post-like.post-like')
      .count({ where: { postDocumentId } });

    const liked = user
      ? (await strapi.db
          .query('api::post-like.post-like')
          .count({ where: { postDocumentId, user: { id: user.id } } })) > 0
      : false;

    return { data: { count, liked } };
  },

  /**
   * POST /api/post-likes/toggle   body: { postDocumentId }
   *
   * One endpoint rather than separate like and unlike routes. The client does not have to
   * know the current state to send the right request, which removes the race where two
   * quick taps produce two likes.
   */
  async toggle(ctx) {
    const user = ctx.state.user as AuthUser;

    if (denyIfBlogRestricted(ctx)) return;

    const body = (ctx.request.body ?? {}) as {
      postDocumentId?: string;
      data?: { postDocumentId?: string };
    };

    const postDocumentId = body.postDocumentId ?? body.data?.postDocumentId;

    if (!postDocumentId) {
      return ctx.badRequest('`postDocumentId` is required');
    }

    const published = await strapi.db.query('api::blog-post.blog-post').findOne({
      where: { documentId: postDocumentId, publishedAt: { $notNull: true } },
      populate: { author: true },
    });

    if (!published) {
      return ctx.notFound('Post not found');
    }

    const existing = await strapi.db.query('api::post-like.post-like').findOne({
      where: { postDocumentId, user: { id: user.id } },
    });

    if (existing) {
      await strapi.db.query('api::post-like.post-like').delete({ where: { id: existing.id } });
    } else {
      await strapi.documents('api::post-like.post-like').create({
        data: { postDocumentId, user: user.id },
      });

      // Only on the way up. Being told somebody un-liked your post helps nobody.
      await notify(strapi, {
        recipientId: published.author?.id,
        actorId: user.id,
        type: 'post-liked',
        title: `${user.username} liked ${published.title}`,
        href: `/blog/${published.slug}`,
      });
    }

    const count = await strapi.db
      .query('api::post-like.post-like')
      .count({ where: { postDocumentId } });

    return { data: { count, liked: !existing } };
  },
}));
