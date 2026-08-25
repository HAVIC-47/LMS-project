import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { NotePencilIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/reveal';
import { getPublishedPosts } from '@/lib/api/public';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Notes on learning, teaching and building the platform.',
};

/**
 * Blog index.
 *
 * Only published posts reach this page, and that is decided on the backend rather than
 * here. The controller pins anonymous and non-editorial callers to `status=published`, so
 * a draft cannot be surfaced by appending a query parameter to the API call underneath.
 *
 * The first post is given a wider treatment so the list has a lead rather than reading as
 * an undifferentiated stack of rows.
 */
export default async function BlogPage() {
  const posts = await getPublishedPosts();

  if (posts.length === 0) {
    return (
      <div className="py-16 lg:py-20">
        <Container className="flex flex-col gap-12">
          <SectionHeading as="h1" title="Writing" />
          <EmptyState
            icon={<NotePencilIcon size={32} aria-hidden />}
            title="Nothing published yet"
            description="Posts appear here once an editor publishes them. Drafts stay private until then."
          />
        </Container>
      </div>
    );
  }

  const [lead, ...rest] = posts;

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          as="h1"
          title="Writing"
          lede="Notes on learning, teaching and how this platform is put together."
        />

        <Reveal>
          <Link
            href={`/blog/${lead.slug}`}
            className="group grid gap-8 rounded-card border border-line bg-surface p-6 transition-colors duration-300 hover:border-line-strong sm:p-8 lg:grid-cols-2 lg:items-center"
          >
            {lead.coverImageUrl ? (
              <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-shell">
                <Image
                  src={lead.coverImageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className="object-cover transition-transform duration-700 [transition-timing-function:var(--ease-settle)] group-hover:scale-[1.02]"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-4">
              <p className="font-mono text-xs tabular-nums text-text-subtle">
                {formatDate(lead.publishedAt ?? lead.createdAt)}
              </p>
              <h2 className="text-2xl font-semibold leading-snug text-text transition-colors duration-200 group-hover:text-accent-text sm:text-3xl">
                {lead.title}
              </h2>
              {lead.excerpt ? (
                <p className="max-w-[56ch] leading-relaxed text-text-muted">{lead.excerpt}</p>
              ) : null}
              {lead.author ? (
                <p className="text-sm text-text-subtle">By {lead.author.username}</p>
              ) : null}
            </div>
          </Link>
        </Reveal>

        {rest.length > 0 ? (
          <div className="flex flex-col">
            {rest.map((post, index) => (
              <Reveal key={post.documentId} delay={index * 0.06}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group grid gap-2 border-b border-line py-7 transition-colors duration-300 first:border-t sm:grid-cols-12 sm:gap-6"
                >
                  <p className="font-mono text-xs tabular-nums text-text-subtle sm:col-span-3 sm:pt-1">
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </p>

                  <div className="flex flex-col gap-2 sm:col-span-9">
                    <h2 className="text-xl font-semibold text-text transition-colors duration-200 group-hover:text-accent-text">
                      {post.title}
                    </h2>
                    {post.excerpt ? (
                      <p className="max-w-[62ch] text-sm leading-relaxed text-text-muted">
                        {post.excerpt}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : null}
      </Container>
    </div>
  );
}
