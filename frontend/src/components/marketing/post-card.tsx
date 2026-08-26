import Link from 'next/link';
import { ArrowUpRightIcon, ChatCircleIcon, HeartIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';
import { CoverImage } from '@/components/ui/cover-image';
import { formatDate, readingTime } from '@/lib/format';
import type { BlogPost } from '@/lib/types';

/**
 * Blog card.
 *
 * Built to the same rules as the course card so the two grids feel like one product, with
 * one difference: the title is allowed three lines instead of being clamped tight, because
 * a headline is the whole proposition of a post whereas a course title is a label.
 *
 * `featured` lays the card out side by side instead of stacked. The column span belongs
 * to the grid item that wraps it, not to the card, so the card stays usable in any grid.
 */
export function PostCard({
  post,
  featured = false,
  priority = false,
  fixedMedia = false,
}: {
  post: BlogPost;
  featured?: boolean;
  priority?: boolean;
  /**
   * Swaps the cover from a ratio to a fixed height on desktop. Needed by the expanding
   * blog grid: with `aspect-[16/10]` a card that widens on hover also gets taller, which
   * drags the height of every card beside it and makes the whole row heave. Pinning the
   * height keeps the expansion purely horizontal. Below `lg` the ratio is kept, because
   * nothing expands there.
   */
  fixedMedia?: boolean;
}) {
  const date = formatDate(post.publishedAt ?? post.createdAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-card',
        'border border-line bg-surface-raised',
        'transition-[transform,border-color,box-shadow] duration-300 [transition-timing-function:var(--ease-settle)]',
        'hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]',
        featured && 'md:flex-row'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-shell',
          featured
            ? 'aspect-[16/10] md:aspect-auto md:min-h-[16rem] md:w-1/2'
            : fixedMedia
              ? 'aspect-[16/10] lg:aspect-auto lg:h-56'
              : 'aspect-[16/10]'
        )}
      >
        <CoverImage
          src={post.coverImageUrl}
          sizes={
            featured
              ? '(max-width: 768px) 100vw, 50vw'
              : // An expanding card reaches roughly half the container, so a flat 33vw
                // would hand the optimizer a source too small for the state the reader
                // actually looks at.
                fixedMedia
                ? '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 45vw'
                : '(max-width: 768px) 100vw, 33vw'
          }
          priority={priority}
          fallback={<span className="microlabel">CourseCatalyst</span>}
          className="transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover:scale-[1.04]"
        />

        <span
          aria-hidden
          className="absolute right-3 top-3 flex size-8 translate-x-1 items-center justify-center rounded-control bg-accent text-accent-ink-on opacity-0 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0 group-hover:opacity-100"
        >
          <ArrowUpRightIcon size={15} weight="bold" />
        </span>
      </div>

      <div className={cn('flex flex-1 flex-col gap-3 p-5', featured && 'md:justify-center md:p-8')}>
        <div className="flex items-center gap-3">
          <span className="microlabel">{date}</span>
          <span aria-hidden className="h-px w-4 bg-line-strong" />
          <span className="microlabel">{readingTime(post.body)} min</span>
        </div>

        <h3
          className={cn(
            'font-serif font-normal leading-snug text-text',
            featured ? 'text-2xl md:text-3xl' : 'text-xl',
            // Two lines, always, in the expanding grid. A squeezed card wraps its title
            // onto an extra line, and because flex items stretch to the tallest in the
            // line that one extra line lifts the height of the whole row the moment the
            // pointer arrives. Reserving the space keeps the expansion purely horizontal.
            fixedMedia && !featured && 'lg:line-clamp-2 lg:min-h-[2lh]'
          )}
        >
          {post.title}
        </h3>

        {post.excerpt ? (
          <p
            className={cn(
              'text-sm leading-relaxed text-text-muted',
              featured ? 'line-clamp-4' : 'line-clamp-3',
              // Same reason as the title: three lines are reserved so the excerpt cannot
              // change the row height by reflowing at a narrower width.
              fixedMedia && !featured && 'lg:min-h-[3lh]'
            )}
          >
            {post.excerpt}
          </p>
        ) : null}

        {/* Engagement and the byline share the footer rule, so the card ends on one line
            rather than two. Both counts always render, including at zero: unlike a rating,
            "0 comments" is a fact about the discussion rather than a verdict on the post. */}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
          <span className="flex items-center gap-1.5 text-xs text-text-subtle">
            <HeartIcon size={13} weight={post.likeCount ? 'fill' : 'regular'} aria-hidden />
            <span className="font-mono tabular-nums text-text">{post.likeCount ?? 0}</span>
            <span className="sr-only">
              {post.likeCount === 1 ? 'like' : 'likes'}
            </span>
          </span>

          <span className="flex items-center gap-1.5 text-xs text-text-subtle">
            <ChatCircleIcon size={13} aria-hidden />
            <span className="font-mono tabular-nums text-text">{post.commentCount ?? 0}</span>
            <span className="sr-only">
              {post.commentCount === 1 ? 'comment' : 'comments'}
            </span>
          </span>

          {post.author ? (
            <span className="ml-auto text-xs text-text-subtle">{post.author.username}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
