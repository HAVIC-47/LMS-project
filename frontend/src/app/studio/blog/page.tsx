import type { Metadata } from 'next';
import Link from 'next/link';
import { NotePencilIcon, PlusIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Container, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { getAuthoredPosts } from '@/lib/api/authoring';
import { requireRole } from '@/lib/guards';
import { ROLES } from '@/lib/types';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Blog' };

/**
 * Blog index for editors.
 *
 * "Write / manage blog posts" is Admin and Content Manager only, so instructors are turned
 * away here even though the rest of the studio is open to them.
 *
 * Drafts and published posts are listed together with a flag rather than split into tabs:
 * the thing an editor wants to know at a glance is which of their posts are still hidden.
 */
export default async function StudioBlogPage() {
  await requireRole([ROLES.ADMIN, ROLES.CONTENT_MANAGER]);

  const posts = await getAuthoredPosts();

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            as="h1"
            title="Blog"
            lede="Drafts stay private until you publish them."
          />

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/studio" variant="outline">
              Studio
            </ButtonLink>
            <ButtonLink href="/studio/blog/new">
              <PlusIcon size={15} weight="bold" aria-hidden />
              New post
            </ButtonLink>
          </div>
        </div>

        {posts.length === 0 ? (
          <EmptyState
            icon={<NotePencilIcon size={32} aria-hidden />}
            title="No posts yet"
            description="Write one. It stays a draft until you publish it."
            action={
              <ButtonLink href="/studio/blog/new" withArrow>
                New post
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col">
            {posts.map((post) => (
              <Link
                key={post.documentId}
                href={`/studio/blog/${post.documentId}`}
                className="group flex flex-wrap items-center justify-between gap-4 border-b border-line py-5 transition-colors duration-200 first:border-t hover:bg-surface"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-medium text-text transition-colors group-hover:text-accent-text">
                      {post.title}
                    </span>
                    {post.isPublished ? (
                      <Badge tone="success">Published</Badge>
                    ) : (
                      <Badge tone="neutral">Draft</Badge>
                    )}
                  </div>
                  {post.author ? <span className="microlabel">{post.author.username}</span> : null}
                </div>

                <span className="microlabel">edited {formatDate(post.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
