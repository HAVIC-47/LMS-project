import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Container } from '@/components/ui/primitives';
import { PostEngagement } from '@/components/blog/post-engagement';
import { getPostBySlug } from '@/lib/api/public';
import { getSessionUser } from '@/lib/session';
import { ROLES } from '@/lib/types';
import { formatDate, readingTime, toParagraphs, isRenderableImage } from '@/lib/format';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: 'Post not found' };
  }

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
  };
}

/**
 * Single post.
 *
 * A draft returns null from the API layer (the backend refuses to serve it to a public
 * caller) and this renders the 404 page. That is the right answer rather than a 403: the
 * existence of unpublished work should not be discoverable by probing slugs.
 */
export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, user] = await Promise.all([getPostBySlug(slug), getSessionUser()]);

  if (!post) {
    notFound();
  }

  const paragraphs = toParagraphs(post.body);

  // Passed down so the client island knows whether to offer the comment box and the
  // delete control. It is a UI hint only; the backend decides both again on every write.
  const viewer = user
    ? {
        id: user.id,
        username: user.username,
        canModerate: user.role === ROLES.ADMIN || user.role === ROLES.CONTENT_MANAGER,
      }
    : null;

  return (
    <article className="py-16 lg:py-20">
      <Container className="flex flex-col gap-10">
        <Link
          href="/blog"
          className="group flex w-fit items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeftIcon
            size={15}
            aria-hidden
            className="transition-transform duration-300 [transition-timing-function:var(--ease-settle)] group-hover:-translate-x-0.5"
          />
          All posts
        </Link>

        <header className="mx-auto flex w-full max-w-[68ch] flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-text-subtle">
            <time dateTime={post.publishedAt ?? post.createdAt}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </time>
            <span aria-hidden>/</span>
            <span>{readingTime(post.body)} min read</span>
          </div>

          <h1 className="display-tight font-serif text-4xl font-normal sm:text-5xl lg:text-6xl">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="text-lg leading-relaxed text-text-muted">{post.excerpt}</p>
          ) : null}

          {post.author ? (
            <p className="text-sm text-text-subtle">By {post.author.username}</p>
          ) : null}
        </header>

        {isRenderableImage(post.coverImageUrl) ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-card bg-shell">
            <Image
              src={post.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 1280px) 100vw, 1200px"
              priority
              className="object-cover"
            />
          </div>
        ) : null}

        {/* 68ch keeps lines inside the comfortable 65 to 75 character band. */}
        <div className="prose-editorial mx-auto flex w-full flex-col gap-6">
          {paragraphs.length === 0 ? (
            <p className="text-text-muted">This post has no body yet.</p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p key={index} className="text-text">
                {paragraph}
              </p>
            ))
          )}
        </div>

        <PostEngagement postDocumentId={post.documentId} viewer={viewer} />
      </Container>
    </article>
  );
}
