import Link from 'next/link';
import { ArrowUpRightIcon, ListChecksIcon, TextAlignLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';
import { CoverImage } from '@/components/ui/cover-image';
import { Stars } from '@/components/ui/stars';
import { LEVEL_LABELS, type Course } from '@/lib/types';

/**
 * Course card.
 *
 * Image-forward, because a catalog is browsed by eye before it is read. The cover fills
 * the top, the title sits directly under it, and the meta sits on a rule at the bottom, so
 * the card has a clear top-to-bottom order instead of being a bag of centred elements.
 *
 * Hover does three things at once, all on transform and opacity so nothing reflows: the
 * card lifts, the cover zooms slightly, and the corner arrow steps in. That is what makes
 * a card feel like an object rather than a bordered link.
 */
export function CourseCard({
  course,
  priority = false,
  fixedMedia = false,
}: {
  course: Course;
  priority?: boolean;
  /**
   * Swaps the cover from a ratio to a fixed height on desktop, for the expanding catalog
   * grid. With `aspect-[16/10]` a card that widens on hover also gets taller, which drags
   * the height of every card beside it and makes the row heave. Pinning the height keeps
   * the expansion purely horizontal. Below `lg` the ratio is kept — nothing expands there.
   */
  fixedMedia?: boolean;
}) {
  const lessonCount = course.lessonCount ?? course.lessons?.length ?? 0;
  const hasQuiz = (course.quizCount ?? course.quizzes?.length ?? 0) > 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-card',
        'border border-line bg-surface-raised',
        'transition-[transform,border-color,box-shadow] duration-300 [transition-timing-function:var(--ease-settle)]',
        'hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-shell',
          fixedMedia ? 'aspect-[16/10] lg:aspect-auto lg:h-56' : 'aspect-[16/10]'
        )}
      >
        {/* A card with a hole where the image goes looks broken. The fallback reads as
            deliberate and keeps every card in the grid the same height. */}
        <CoverImage
          src={course.coverImageUrl}
          sizes={
            fixedMedia
              ? // An expanding card reaches roughly half the container, so a flat 33vw
                // would hand the optimizer a source too small for the state a reader
                // actually looks at.
                '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 45vw'
              : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
          }
          priority={priority}
          // Not the level: the chip above already says it, and repeating it inside the
          // same tile reads as a rendering mistake.
          fallback={<span className="font-serif text-2xl text-text-subtle">CourseCatalyst</span>}
          className="transition-transform duration-500 [transition-timing-function:var(--ease-settle)] group-hover:scale-[1.04]"
        />

        <span className="absolute left-3 top-3 rounded-control bg-page/85 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text backdrop-blur-md">
          {LEVEL_LABELS[course.level]}
        </span>

        <span
          aria-hidden
          className="absolute right-3 top-3 flex size-8 translate-x-1 items-center justify-center rounded-control bg-accent text-accent-ink-on opacity-0 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0 group-hover:opacity-100"
        >
          <ArrowUpRightIcon size={15} weight="bold" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3
          className={cn(
            'font-serif text-xl font-normal leading-snug text-text',
            // Two lines reserved, always: a squeezed card wraps its title onto an extra
            // line, and because flex items stretch to the tallest in the line that one
            // extra line lifts the whole row the moment the pointer arrives.
            fixedMedia && 'lg:line-clamp-2 lg:min-h-[2lh]'
          )}
        >
          {course.title}
        </h3>

        {/* Only once somebody has rated it. Rendering "0.0 (0)" on an unrated course reads
            as a bad score rather than as an absent one, and every new course would launch
            looking like a failure. */}
        {course.rating && course.rating.count > 0 ? (
          <Stars value={course.rating.average} count={course.rating.count} size={13} />
        ) : null}

        {course.description ? (
          <p
            className={cn(
              'line-clamp-2 text-sm leading-relaxed text-text-muted',
              // Same reason as the title. The clamp caps the maximum; this sets the floor,
              // so the block cannot change height by reflowing at a narrower width.
              fixedMedia && 'lg:min-h-[2lh]'
            )}
          >
            {course.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
          <span className="flex items-center gap-1.5 text-xs text-text-subtle">
            <TextAlignLeftIcon size={14} aria-hidden />
            <span className="font-mono tabular-nums text-text">
              {String(lessonCount).padStart(2, '0')}
            </span>
            lessons
          </span>

          {hasQuiz ? (
            <span className="flex items-center gap-1.5 text-xs text-text-subtle">
              <ListChecksIcon size={14} aria-hidden />
              Quiz
            </span>
          ) : null}

          {course.instructor ? (
            <span className="ml-auto text-xs text-text-subtle">{course.instructor.username}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
