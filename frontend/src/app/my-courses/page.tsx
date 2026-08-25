import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Container, EmptyState, ProgressRail, SectionHeading } from '@/components/ui/primitives';
import { getMyEnrollments } from '@/lib/api/student';
import { getMyAttempts } from '@/lib/api/learn';
import { requireRole } from '@/lib/guards';
import { ROLES } from '@/lib/types';
import { formatDate, isRenderableImage } from '@/lib/format';

export const metadata: Metadata = {
  title: 'My courses',
};

/**
 * My Courses.
 *
 * Sorted so unfinished work comes first: a finished course is a record, an unfinished one
 * is a task, and the page should open on the task.
 */
export default async function MyCoursesPage() {
  await requireRole([ROLES.STUDENT]);

  const [enrollments, attempts] = await Promise.all([getMyEnrollments(), getMyAttempts()]);

  if (enrollments.length === 0) {
    return (
      <div className="py-16 lg:py-20">
        <Container className="flex flex-col gap-12">
          <SectionHeading as="h1" title="My courses" />
          <EmptyState
            icon={<GraduationCapIcon size={32} aria-hidden />}
            title="You are not enrolled in anything yet"
            description="Browse the catalog and enroll. Your progress will show up here."
            action={
              <ButtonLink href="/courses" withArrow>
                Browse courses
              </ButtonLink>
            }
          />
        </Container>
      </div>
    );
  }

  const inProgress = enrollments.filter((entry) => entry.progress.percentage < 100);
  const finished = enrollments.filter((entry) => entry.progress.percentage === 100);
  const ordered = [...inProgress, ...finished];

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          as="h1"
          title="My courses"
          lede="Pick up where you stopped. Progress counts the lessons you marked complete."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((enrollment) => {
            const complete = enrollment.progress.percentage === 100;

            return (
              <Link
                key={enrollment.documentId}
                href={`/learn/${enrollment.course.slug}`}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-card border border-line bg-surface-raised transition-[border-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:-translate-y-0.5 hover:border-line-strong"
              >
                {isRenderableImage(enrollment.course.coverImageUrl) ? (
                  <div className="relative aspect-[16/9] bg-shell">
                    <Image
                      src={enrollment.course.coverImageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <h2 className="font-semibold leading-snug text-text transition-colors duration-200 group-hover:text-accent-text">
                    {enrollment.course.title}
                  </h2>

                  <ProgressRail
                    className="mt-auto"
                    value={enrollment.progress.percentage}
                    size="sm"
                    label={
                      complete
                        ? 'Finished'
                        : `${enrollment.progress.completed} of ${enrollment.progress.total} lessons`
                    }
                  />

                  <p className="microlabel">
                    {complete ? 'Review any lesson' : 'Continue'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {attempts.length > 0 ? (
          <section className="flex flex-col gap-5">
            <h2 className="text-xl font-semibold">Quiz results</h2>

            <div className="flex flex-col">
              {attempts.map((attempt) => (
                <div
                  key={attempt.documentId}
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 first:border-t"
                >
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate font-medium text-text">
                      {attempt.quiz?.title ?? 'Quiz'}
                    </p>
                    <p className="truncate text-sm text-text-subtle">
                      {attempt.course?.title ?? ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <span className="font-mono tabular-nums text-text">{attempt.score}%</span>
                    <span
                      className={
                        attempt.passed ? 'microlabel text-success' : 'microlabel text-text-subtle'
                      }
                    >
                      {attempt.passed ? 'Passed' : 'Not passed'}
                    </span>
                    <span className="microlabel">{formatDate(attempt.submittedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
