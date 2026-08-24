import Image from 'next/image';
import Link from 'next/link';
import { ListChecksIcon, TextAlignLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { LevelBadge } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import type { Course } from '@/lib/types';

/**
 * Course card.
 *
 * One of the two places the nested-enclosure treatment is used, because a card here is a
 * real affordance: it opens something. The image sits in the inner core so the two radii
 * stay concentric and the cover reads as inset rather than pasted on.
 */
export function CourseCard({ course, priority = false }: { course: Course; priority?: boolean }) {
  // Counts are computed by the backend; the catalog response carries no lesson list.
  const lessonCount = course.lessonCount ?? course.lessons?.length ?? 0;
  const hasQuiz = (course.quizCount ?? course.quizzes?.length ?? 0) > 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        'enclosure group block h-full cursor-pointer',
        'transition-[transform,border-color,box-shadow] duration-500 [transition-timing-function:var(--ease-settle)]',
        'hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]'
      )}
    >
      <article className="enclosure-core flex h-full flex-col overflow-hidden">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(var(--radius-card)-1px)] bg-shell">
          {course.coverImageUrl ? (
            <Image
              src={course.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-700 [transition-timing-function:var(--ease-settle)] group-hover:scale-[1.03]"
            />
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={course.level} />
            {!course.isPublished ? <span className="text-xs text-text-subtle">Unpublished</span> : null}
          </div>

          <h3 className="text-lg font-semibold leading-snug text-text">{course.title}</h3>

          {course.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">{course.description}</p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm text-text-subtle">
            <span className="flex items-center gap-1.5">
              <TextAlignLeftIcon size={15} aria-hidden />
              <span className="font-mono text-xs tabular-nums">{lessonCount}</span>
              {lessonCount === 1 ? 'lesson' : 'lessons'}
            </span>

            {hasQuiz ? (
              <span className="flex items-center gap-1.5">
                <ListChecksIcon size={15} aria-hidden />
                Graded quiz
              </span>
            ) : null}
          </div>

          {course.instructor ? (
            <p className="text-sm text-text-subtle">Taught by {course.instructor.username}</p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
