import type { Core } from '@strapi/strapi';

/**
 * The writing read model, for the Content Manager dashboard.
 *
 * Comments and likes reference a post by `postDocumentId` rather than by a relation — that
 * was forced by Draft & Publish, which keeps a draft row *and* a published row per
 * document, so a relation would bind to one row and be stranded when the other is served.
 * The upside here is that both can be counted in a single query each and joined in memory.
 *
 * Scoped by author unless the caller is an admin, which mirrors `blog-post.mine`: a content
 * manager sees their own writing, an admin sees the whole desk.
 */

type PostRow = {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  author?: { id: number; username: string } | null;
};

/** `YYYY-MM`, so a publishing timeline groups without pulling in a date library. */
const monthKey = (iso: string) => iso.slice(0, 7);

export const buildBlogInsights = async (
  strapi: Core.Strapi,
  authorId: number | null
) => {
  const where = authorId === null ? {} : { author: { id: authorId } };

  const rows = (await strapi.db.query('api::blog-post.blog-post').findMany({
    where,
    populate: { author: true },
    orderBy: { updatedAt: 'desc' },
  })) as PostRow[];

  /**
   * Collapse the draft and published rows of one document into a single record. A document
   * counts as published when any of its rows carries a `publishedAt`, and the published
   * row wins for display so the listing shows live titles rather than unsaved edits.
   */
  const documents = new Map<string, PostRow>();

  for (const row of rows) {
    const existing = documents.get(row.documentId);

    if (!existing) {
      documents.set(row.documentId, row);
      continue;
    }

    documents.set(row.documentId, {
      ...(row.publishedAt ? row : existing),
      publishedAt: existing.publishedAt ?? row.publishedAt,
    });
  }

  const posts = [...documents.values()];
  const documentIds = posts.map((post) => post.documentId);

  const [comments, likes] = documentIds.length
    ? await Promise.all([
        strapi.db.query('api::comment.comment').findMany({
          where: { postDocumentId: { $in: documentIds } },
          select: ['postDocumentId', 'createdAt'],
        }),
        strapi.db.query('api::post-like.post-like').findMany({
          where: { postDocumentId: { $in: documentIds } },
          select: ['postDocumentId'],
        }),
      ])
    : [[], []];

  const countBy = (list: { postDocumentId: string }[]) => {
    const counts = new Map<string, number>();
    for (const row of list) {
      counts.set(row.postDocumentId, (counts.get(row.postDocumentId) ?? 0) + 1);
    }
    return counts;
  };

  const commentsByPost = countBy(comments as { postDocumentId: string }[]);
  const likesByPost = countBy(likes as { postDocumentId: string }[]);

  const enriched = posts.map((post) => ({
    documentId: post.documentId,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt,
    isPublished: Boolean(post.publishedAt),
    author: post.author ? { id: post.author.id, username: post.author.username } : null,
    comments: commentsByPost.get(post.documentId) ?? 0,
    likes: likesByPost.get(post.documentId) ?? 0,
  }));

  const published = enriched.filter((post) => post.isPublished);

  // A publishing timeline over the last six months. Built from a fixed window rather than
  // from the data, so a quiet month shows as a gap instead of being silently skipped.
  const now = new Date();
  const months: { month: string; label: string; published: number }[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const key = date.toISOString().slice(0, 7);

    months.push({
      month: key,
      label: date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
      published: published.filter((post) => monthKey(post.publishedAt as string) === key).length,
    });
  }

  return {
    posts: enriched,
    months,
    summary: {
      total: enriched.length,
      published: published.length,
      drafts: enriched.length - published.length,
      comments: [...commentsByPost.values()].reduce((sum, n) => sum + n, 0),
      likes: [...likesByPost.values()].reduce((sum, n) => sum + n, 0),
      // Engagement per published post is the number worth watching: a total only says how
      // long you have been writing.
      averageEngagement:
        published.length === 0
          ? 0
          : Math.round(
              published.reduce((sum, post) => sum + post.likes + post.comments, 0) /
                published.length
            ),
    },
  };
};
