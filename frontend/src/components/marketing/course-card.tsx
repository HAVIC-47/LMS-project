import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr';
import { LevelBadge } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import type { Course } from '@/lib/types';

/**
 * Course card.
 *
 * Structural rather than boxy: the cover sits flush at the top of the panel and the meta
 * row sits on a hairline at the bottom, so the card reads as a slice of a grid instead of
 * a floating tile. Hover lifts the border and advances the corner arrow; the image scale
 * is small enough not to feel like a stock template.
 */
export function CourseCard({ course, priority = false }: { course: Course; priority?: boolean }) {
  // Counts come from the backend; the catalog response carries no lesson list.
  const lessonCount = course.lessonCount ?? course.lessons?.length ?? 0;
  const hasQuiz = (course.quizCount ?? course.quizzes?.length ?? 0) > 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        'group lit relative flex h-full cursor-pointer flex-col overflow-hidden rounded-card',
        'border border-line bg-surface-raised',
        'transition-[border-color,transform] duration-300 [transition-timing-function:var(--ease-settle)]',
        'hover:-translate-y-0.5 hover:border-line-strong'
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-shell">
        {course.coverImageUrl ? (
          <Image
            src={course.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={priority}
            className="object-cover opacity-90 transition-[transform,opacity] duration-500 [transition-timing-function:var(--ease-settle)] group-hover:scale-[1.02] group-hover:opacity-100"
          />
        ) : null}

        <span
          aria-hidden
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-pill bg-page/80 text-text backdrop-blur-md transition-transform duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          <ArrowUpRightIcon size={14} weight="bold" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold leading-snug text-text">{course.title}</h3>

        {course.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">{course.description}</p>
        ) : null}

        <div className="mt-auto flex items-center gap-3 border-t border-line pt-4">
          <span className="microlabel text-text-subtle">
            <span className="text-text">{String(lessonCount).padStart(2, '0')}</span> lessons
          </span>

          <LevelBadge level={course.level} />

          {hasQuiz ? (
            <span className="microlabel border-l border-line pl-2 text-text-subtle">Quiz</span>
          ) : null}
        </div>

        {course.instructor ? (
          <p className="text-sm text-text-subtle">{course.instructor.username}</p>
        ) : null}
      </div>
    </Link>
  );
}
