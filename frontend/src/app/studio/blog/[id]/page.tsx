import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, Panel } from '@/components/ui/primitives';
import { PostForm } from '@/components/studio/post-form';
import { getAuthoredPosts, getPostForEditing } from '@/lib/api/authoring';
import { requireRole } from '@/lib/guards';
import { ROLES } from '@/lib/types';

export const metadata: Metadata = { title: 'Edit post' };

/**
 * Post editor.
 *
 * Two reads rather than one: `/blog-posts/mine` establishes that this post is one the
 * caller may edit and reports whether it is published, and `?status=draft` fetches the
 * working copy. Strapi keeps a draft row and a published row per document, and editing the
 * published one would mean changes going live the moment they are saved, which defeats the
 * point of having a draft state at all.
 */
export default async function EditPostPage({ params }: PageProps<'/studio/blog/[id]'>) {
  await requireRole([ROLES.ADMIN, ROLES.CONTENT_MANAGER]);

  const { id } = await params;

  const [posts, post] = await Promise.all([getAuthoredPosts(), getPostForEditing(id)]);
  const listed = posts.find((entry) => entry.documentId === id);

  // Not in the caller's own list means it belongs to somebody else, and a content manager
  // may only manage their own. 404 rather than an editor whose every save returns 403.
  if (!post || !listed) {
    notFound();
  }

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex max-w-3xl flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/studio/blog"
            className="group flex w-fit items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeftIcon
              size={15}
              aria-hidden
              className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:-translate-x-0.5"
            />
            Blog
          </Link>

          {listed.isPublished ? (
            <Link
              href={`/blog/${post.slug}`}
              className="flex items-center gap-2 text-sm font-medium text-accent-text"
            >
              View published post
              <ArrowSquareOutIcon size={15} aria-hidden />
            </Link>
          ) : null}
        </div>

        <h1 className="display-tight text-3xl font-semibold sm:text-4xl">{post.title}</h1>

        <Panel className="p-7">
          <PostForm
            initial={{
              documentId: post.documentId,
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt ?? '',
              body: post.body ?? '',
              coverImageUrl: post.coverImageUrl ?? '',
              isPublished: listed.isPublished,
            }}
          />
        </Panel>
      </Container>
    </div>
  );
}
