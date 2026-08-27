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

        {/* Cover left, title right, body beneath.
            The two sit in one grid rather than stacked blocks so the tall title column and
            the image share a baseline and a height. DOM order is header-then-image, and the
            image is pulled left only from `lg` up: on a phone the columns collapse, and the
            first thing you should meet is the headline, not a picture of nothing in
            particular. `items-center` rather than `items-stretch` because a short title
            beside a tall image should sit centred against it, not pinned to the top with a
            gap under it. */}
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:gap-14">
          <header className="flex flex-col gap-6 lg:order-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-text-subtle">
              <time dateTime={post.publishedAt ?? post.createdAt}>
                {formatDate(post.publishedAt ?? post.createdAt)}
              </time>
              <span aria-hidden>/</span>
              <span>{readingTime(post.body)} min read</span>
            </div>

            <h1 className="display-tight font-serif text-[clamp(2.5rem,5vw,4.5rem)] font-normal">
              {post.title}
            </h1>

            {post.excerpt ? (
              <p className="max-w-[46ch] text-xl leading-relaxed text-text-muted">{post.excerpt}</p>
            ) : null}

            {/* The byline is the natural way into a profile: you finish something and want
                to know who wrote it. Linking here rather than from the card avoids nesting
                an anchor inside the card's own link, which is invalid markup. */}
            {post.author ? (
              <p className="text-sm text-text-subtle">
                By{' '}
                <Link
                  href={`/u/${post.author.username}`}
                  className="text-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
                >
                  {post.author.username}
                </Link>
              </p>
            ) : null}
          </header>

          {isRenderableImage(post.coverImageUrl) ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-shell lg:order-1 lg:aspect-square">
              <Image
                src={post.coverImageUrl}
                alt=""
                fill
                // The image is half the grid on a wide screen and the full column on a
                // phone, so the browser is told exactly that rather than left to assume
                // full-width and download twice the pixels it will paint.
                sizes="(max-width: 1024px) 100vw, 34vw"
                priority
                className="object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* Full container width and justified, by request.
            Both work against readability at this measure, so both are mitigated rather than
            left raw. Leading is opened to 1.9 -- at roughly 180 characters a line, the return
            sweep to the left edge is where the eye loses its place, and extra space between
            lines gives it a clearer target.
            `hyphens-auto` is what makes justification survive: justified text sets by
            stretching word spaces, and with no hyphenation those gaps line up vertically into
            the white "rivers" that make justified web text look broken. Letting the browser
            break long words keeps the spacing even. It needs `lang` on <html>, which layout.tsx
            sets. */}
        <div className="prose-editorial flex w-full flex-col gap-6 text-justify leading-[1.9] hyphens-auto">
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
