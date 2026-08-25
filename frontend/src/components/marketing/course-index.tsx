import Image from 'next/image';
import Link from 'next/link';
import { LEVEL_LABELS, type Course } from '@/lib/types';
import { isRenderableImage } from '@/lib/format';

/**
 * The course index.
 *
 * This replaces the three-across card grid. Three equal cards in a row is the single most
 * recognisable generated-page layout there is, and it wastes most of the screen on padding
 * around thumbnails.
 *
 * A numbered, rule-separated index reads as a contents page: it carries any number of
 * courses at the same density, puts the titles at a size worth reading, and lets the
 * cover image appear on hover instead of occupying the layout permanently.
 */
export function CourseIndex({ courses }: { courses: Course[] }) {
  return (
    <ol className="flex flex-col">
      {courses.map((course, index) => (
        <li key={course.documentId}>
          <Link
            href={`/courses/${course.slug}`}
            className="index-row group cursor-pointer grid-cols-[auto_1fr] px-2 hover:bg-surface md:grid-cols-[3rem_1fr_auto_auto]"
          >
            <span className="font-mono text-xs tabular-nums text-text-subtle">
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="font-serif text-2xl font-normal leading-tight text-text sm:text-3xl">
                {course.title}
              </h3>

              {course.description ? (
                <p className="line-clamp-2 max-w-[58ch] text-sm leading-relaxed text-text-muted">
                  {course.description}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:hidden">
                <span className="microlabel">{LEVEL_LABELS[course.level]}</span>
                <span className="microlabel">
                  {String(course.lessonCount ?? 0).padStart(2, '0')} lessons
                </span>
                {course.instructor ? (
                  <span className="microlabel">{course.instructor.username}</span>
                ) : null}
              </div>
            </div>

            {/* Hidden below md: on a phone the row is already two lines and a thumbnail
                would push the title into a column too narrow to read. */}
            <div className="hidden flex-col items-end gap-1 md:flex">
              <span className="microlabel">{LEVEL_LABELS[course.level]}</span>
              <span className="microlabel">
                {String(course.lessonCount ?? 0).padStart(2, '0')} lessons
              </span>
              {course.instructor ? (
                <span className="microlabel">{course.instructor.username}</span>
              ) : null}
            </div>

            {/* The cover is revealed rather than always shown, so the index stays a list
                of titles and the image is a reward for interest. Width is reserved either
                way, so nothing shifts on hover. */}
            <div className="hidden w-28 shrink-0 md:block">
              {isRenderableImage(course.coverImageUrl) ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card opacity-0 grayscale transition-[opacity,filter] duration-500 [transition-timing-function:var(--ease-settle)] group-hover:opacity-100 group-hover:grayscale-0">
                  <Image
                    src={course.coverImageUrl}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
