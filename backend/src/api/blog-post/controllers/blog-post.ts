import type { Core } from '@strapi/strapi';
import { factories } from '@strapi/strapi';
import { canManageBlogPost, isAdmin, isContentManager, type AuthUser } from '../../../utils/permissions';
import { linkUserRelation } from '../../../utils/resolve';

const canSeeDrafts = (user?: AuthUser) => isAdmin(user) || isContentManager(user);

export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  /**
   * Draft vs Published is Strapi's native Draft & Publish, but the guard is ours.
   *
   * In Strapi 5 the visible version is chosen by a `status` query parameter, and it is
   * *not* permission-checked: any caller who can read blog posts could ask for
   * `?status=draft` and read unpublished work. So the parameter is overwritten — not
   * merged — for anyone who is not an admin or content manager.
   */
  async find(ctx) {
    const user = ctx.state.user as AuthUser | undefined;

    if (!canSeeDrafts(user)) {
      ctx.query = { ...ctx.query, status: 'published' };
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    const user = ctx.state.user as AuthUser | undefined;

    if (!canSeeDrafts(user)) {
      ctx.query = { ...ctx.query, status: 'published' };
    }

    return super.findOne(ctx);
  },

  /**
   * Authorship is server-assigned, exactly like course ownership: a content manager who
   * could set `author` freely could write a post under a colleague's name, or under the
   * admin's, and then edit it through the ownership check.
   */
  async create(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const data = { ...(body.data ?? {}) };

    // Stripped rather than replaced: the content API rejects a relation to a content type
    // the caller cannot `find`, and no role is granted `users-permissions.user.find`.
    // `linkUserRelation` writes the author server-side instead.
    delete data.author;

    ctx.request.body = { ...body, data };

    // Strapi 5's REST `create` publishes immediately unless told otherwise, which would
    // make "Draft vs Published" meaningless — every new post would go live the moment it
    // was written. A post starts as a draft and becomes visible only via /publish.
    ctx.query = { ...ctx.query, status: 'draft' };

    const response = (await super.create(ctx)) as { data?: { documentId?: string } };
    const documentId = response?.data?.documentId;

    if (documentId) {
      await linkUserRelation(strapi, 'api::blog-post.blog-post', documentId, 'author', user.id);
    }

    return response;
  },

  /**
   * "Admin has full control over every blog post (including others'); Content Manager
   * manages the posts they can create." The route policy has already established the
   * caller is one of those two; this decides which posts they may touch.
   */
  async update(ctx) {
    const user = ctx.state.user as AuthUser;

    const post = await strapi.db.query('api::blog-post.blog-post').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true },
    });

    if (!post) {
      return ctx.notFound('Post not found');
    }

    if (!canManageBlogPost(user, post)) {
      return ctx.forbidden('You can only edit your own posts');
    }

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const data = { ...(body.data ?? {}) };

    // Authorship is set once, at creation, and is not re-assignable through the API.
    delete data.author;

    ctx.request.body = { ...body, data };

    /**
     * Editing writes to the draft. If the document is currently live, it is re-published
     * afterwards so the edit actually reaches readers — otherwise saving a published post
     * would silently update an invisible draft and leave the stale version online. A post
     * that was a draft stays a draft.
     */
    const wasPublished = Boolean(
      await strapi.db
        .query('api::blog-post.blog-post')
        .findOne({ where: { documentId: ctx.params.id, publishedAt: { $notNull: true } } })
    );

    ctx.query = { ...ctx.query, status: 'draft' };

    const response = await super.update(ctx);

    if (wasPublished) {
      await strapi.documents('api::blog-post.blog-post').publish({ documentId: ctx.params.id });
    }

    return response;
  },

  async delete(ctx) {
    const user = ctx.state.user as AuthUser;

    const post = await strapi.db.query('api::blog-post.blog-post').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true },
    });

    if (!post) {
      return ctx.notFound('Post not found');
    }

    if (!canManageBlogPost(user, post)) {
      return ctx.forbidden('You can only delete your own posts');
    }

    return super.delete(ctx);
  },

  /**
   * GET /api/blog-posts/mine
   *
   * The editor's list: drafts and published posts together, each flagged. Strapi keeps a
   * draft row and a published row per document, so the rows are grouped by documentId and
   * a document counts as published when any of its rows carries a `publishedAt`.
   */
  async mine(ctx) {
    const user = ctx.state.user as AuthUser;

    const where = isAdmin(user) ? {} : { author: { id: user.id } };

    const rows = await strapi.db.query('api::blog-post.blog-post').findMany({
      where,
      populate: { author: true },
      orderBy: { updatedAt: 'desc' },
    });

    const byDocument = new Map<
      string,
      {
        documentId: string;
        title: string;
        slug: string;
        excerpt: string | null;
        coverImageUrl: string | null;
        updatedAt: string;
        isPublished: boolean;
        author: { id: number; username: string } | null;
      }
    >();

    for (const row of rows as {
      documentId: string;
      title: string;
      slug: string;
      excerpt?: string;
      coverImageUrl?: string;
      updatedAt: string;
      publishedAt?: string | null;
      author?: { id: number; username: string } | null;
    }[]) {
      const existing = byDocument.get(row.documentId);

      byDocument.set(row.documentId, {
        documentId: row.documentId,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt ?? null,
        coverImageUrl: row.coverImageUrl ?? null,
        updatedAt: row.updatedAt,
        isPublished: Boolean(existing?.isPublished) || Boolean(row.publishedAt),
        author: row.author ? { id: row.author.id, username: row.author.username } : null,
      });
    }

    return { data: Array.from(byDocument.values()) };
  },

  /**
   * POST /api/blog-posts/:id/publish  and  /unpublish
   *
   * Explicit endpoints instead of asking the client to send the right `status`, so the
   * draft -> published transition is one obvious call that the ownership check wraps.
   */
  async publish(ctx) {
    const outcome = await setPublishState(
      strapi,
      ctx.state.user as AuthUser,
      ctx.params.id,
      true
    );

    if (outcome.error === 'not-found') return ctx.notFound('Post not found');
    if (outcome.error === 'forbidden') return ctx.forbidden('You can only publish your own posts');

    return { data: outcome.data };
  },

  async unpublish(ctx) {
    const outcome = await setPublishState(
      strapi,
      ctx.state.user as AuthUser,
      ctx.params.id,
      false
    );

    if (outcome.error === 'not-found') return ctx.notFound('Post not found');
    if (outcome.error === 'forbidden') return ctx.forbidden('You can only unpublish your own posts');

    return { data: outcome.data };
  },
}));

type PublishOutcome =
  | { error: 'not-found' | 'forbidden'; data?: undefined }
  | { error: null; data: { documentId: string; isPublished: boolean } };

/**
 * Shared by publish and unpublish. It returns an outcome instead of writing to `ctx` so
 * the two handlers stay the only place that decides what an HTTP response looks like.
 */
async function setPublishState(
  strapi: Core.Strapi,
  user: AuthUser,
  documentId: string,
  shouldPublish: boolean
): Promise<PublishOutcome> {
  const post = await strapi.db.query('api::blog-post.blog-post').findOne({
    where: { documentId },
    populate: { author: true },
  });

  if (!post) {
    return { error: 'not-found' };
  }

  if (!canManageBlogPost(user, post)) {
    return { error: 'forbidden' };
  }

  const documents = strapi.documents('api::blog-post.blog-post');

  if (shouldPublish) {
    await documents.publish({ documentId });
  } else {
    await documents.unpublish({ documentId });
  }

  return { error: null, data: { documentId, isPublished: shouldPublish } };
}
