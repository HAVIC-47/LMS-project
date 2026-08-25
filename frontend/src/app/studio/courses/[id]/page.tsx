import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, Panel, ProgressRail } from '@/components/ui/primitives';
import { CourseForm } from '@/components/studio/course-form';
import { LessonEditor } from '@/components/studio/lesson-editor';
import { QuizEditor } from '@/components/studio/quiz-editor';
import { getOwnedCourses } from '@/lib/api/staff';
import {
  getLessonsForCourse,
  getQuizForCourse,
  getStudentsProgress,
} from '@/lib/api/authoring';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Edit course' };

/**
 * Course editor.
 *
 * The course is located through `/courses/mine` rather than fetched by id directly. That
 * list is already scoped by the backend, so an instructor who guesses another instructor's
 * documentId gets a 404 here instead of an editor whose every save would fail with a 403.
 * Failing at the door is clearer than failing at each button.
 */
export default async function EditCoursePage({ params }: PageProps<'/studio/courses/[id]'>) {
  const { id } = await params;

  const courses = await getOwnedCourses();
  const course = courses.find((entry) => entry.documentId === id);

  if (!course) {
    notFound();
  }

  const [lessons, quiz, students] = await Promise.all([
    getLessonsForCourse(course.documentId),
    getQuizForCourse(course.documentId),
    getStudentsProgress(course.documentId),
  ]);

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Link
            href="/studio"
            className="group flex w-fit items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeftIcon
              size={15}
              aria-hidden
              className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:-translate-x-0.5"
            />
            Studio
          </Link>

          {course.isPublished ? (
            <Link
              href={`/courses/${course.slug}`}
              className="flex items-center gap-2 text-sm font-medium text-accent-text"
            >
              View public page
              <ArrowSquareOutIcon size={15} aria-hidden />
            </Link>
          ) : null}
        </div>

        <h1 className="display-tight text-3xl font-semibold sm:text-4xl">{course.title}</h1>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="flex flex-col gap-12 lg:col-span-7">
            <LessonEditor courseId={course.documentId} lessons={lessons} />
            <QuizEditor courseId={course.documentId} quiz={quiz} />
          </div>

          <div className="flex flex-col gap-12 lg:col-span-5">
            <section className="flex flex-col gap-5">
              <h2 className="text-xl font-semibold">Details</h2>
              <Panel className="p-6">
                <CourseForm
                  initial={{
                    documentId: course.documentId,
                    title: course.title,
                    slug: course.slug,
                    description: course.description ?? '',
                    coverImageUrl: course.coverImageUrl ?? '',
                    level: course.level,
                    isPublished: course.isPublished,
                  }}
                />
              </Panel>
            </section>

            <section className="flex flex-col gap-5">
              <h2 className="text-xl font-semibold">Students</h2>

              {students.length === 0 ? (
                <p className="rounded-card border border-dashed border-line-strong px-5 py-8 text-center text-text-muted">
                  Nobody is enrolled yet.
                </p>
              ) : (
                <div className="flex flex-col">
                  {students.map((row) => (
                    <div
                      key={row.student.id}
                      className="flex flex-col gap-3 border-b border-line py-4 first:border-t"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <span className="font-medium text-text">{row.student.username}</span>
                        <span className="microlabel">
                          joined {formatDate(row.enrolledAt)}
                        </span>
                      </div>

                      <ProgressRail
                        value={row.percentage}
                        size="sm"
                        label={`${row.completed} of ${row.total} lessons`}
                      />

                      <p className="text-sm text-text-subtle">
                        {row.bestQuizScore === null ? (
                          'No quiz attempt yet'
                        ) : (
                          <>
                            Best quiz score{' '}
                            <span className="font-mono tabular-nums text-text">
                              {row.bestQuizScore}%
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
