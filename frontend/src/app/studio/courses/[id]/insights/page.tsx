import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Container } from '@/components/ui/primitives';
import { BarChart, ChartCard, Ring, StackedBar } from '@/components/ui/charts';
import { CourseCohort } from '@/components/studio/course-insights';
import { getCourseInsights } from '@/lib/api/insights';
import { requireRole } from '@/lib/guards';
import { ROLES } from '@/lib/types';

export const metadata: Metadata = { title: 'Course insights' };

type Props = { params: Promise<{ id: string }> };

/**
 * One course, from the staff side.
 *
 * This is where a course title on the instructor dashboard leads, instead of the public
 * course page. The public page sells the course; this one answers whether it is working —
 * who enrolled, where they stalled, and what they got wrong.
 *
 * The role guard decides what is worth rendering, not what is reachable. `getCourseInsights`
 * carries the caller's token and the backend refuses it for a course they do not own, so an
 * instructor who guessed another instructor's document id gets a 404 here rather than a
 * page full of somebody else's students.
 */
export default async function CourseInsightsPage({ params }: Props) {
  await requireRole([ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR]);

  const { id } = await params;
  const insights = await getCourseInsights(id);

  if (!insights) notFound();

  const { course, summary, lessons, quizzes } = insights;

  // Where people stop. Completion counts fall as the course goes on, and the lesson where
  // the fall is steepest is the one worth rewriting — which is the whole reason this chart
  // is ordered by lesson rather than sorted by value.
  const lessonBars = lessons.map((lesson) => ({
    label: String(lesson.order).padStart(2, '0'),
    value: lesson.completedCount,
    hint: `${lesson.title}: ${lesson.completedCount} completed`,
  }));

  const quizBars = quizzes.map((quiz) => ({
    label: quiz.title.replace(/^Checkpoint\s*/i, 'C').slice(0, 10),
    value: quiz.averageScore,
    hint: `${quiz.title}: ${quiz.averageScore}% average over ${quiz.attemptCount} attempts`,
  }));

  return (
    <div className="py-12 lg:py-16">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <Link
            href="/dashboard"
            className="group flex w-fit items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeftIcon
              size={14}
              aria-hidden
              className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:-translate-x-0.5"
            />
            Dashboard
          </Link>

          <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="display-tight font-serif text-[2rem] font-normal sm:text-[2.5rem]">
                  {course.title}
                </h1>
                {course.isPublished ? null : <Badge tone="neutral">Draft</Badge>}
              </div>
              <p className="text-text-muted">
                {summary.students} enrolled · {summary.lessons} lessons · {quizzes.length}{' '}
                {quizzes.length === 1 ? 'quiz' : 'quizzes'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/studio/courses/${id}`} variant="outline" size="sm">
                Edit course
              </ButtonLink>
              <ButtonLink href={`/courses/${course.slug}`} variant="ghost" size="sm">
                Public page
              </ButtonLink>
            </div>
          </header>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
          <Tile value={summary.students} label="students" />
          <Tile value={`${summary.averageCompletion}%`} label="mean completion" />
          <Tile
            value={summary.attempts === 0 ? '—' : `${summary.averageScore}%`}
            label="mean quiz mark"
          />
          <Tile
            value={summary.attempts === 0 ? '—' : `${summary.passRate}%`}
            label="pass rate"
          />
        </dl>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <ChartCard title="Where the cohort is" caption="Every enrolled student.">
            <div className="flex flex-col items-center gap-6 py-2">
              <Ring value={summary.averageCompletion} />
              <StackedBar
                className="w-full"
                segments={[
                  { label: 'finished', value: summary.finished, tone: 'accent' },
                  { label: 'in progress', value: summary.started, tone: 'muted' },
                  { label: 'not started', value: summary.notStarted, tone: 'faint' },
                ]}
              />
            </div>
          </ChartCard>

          <div className="flex flex-col gap-6">
            <ChartCard
              title="Completion by lesson"
              caption="In course order — the steepest drop is where people stop."
            >
              <BarChart data={lessonBars} height={112} />
            </ChartCard>

            <ChartCard title="Average mark by quiz" caption="A low bar is usually a bad question.">
              {quizBars.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-muted">
                  This course has no quizzes.
                </p>
              ) : (
                <BarChart data={quizBars} max={100} suffix="%" height={112} />
              )}
            </ChartCard>
          </div>
        </div>

        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-serif text-2xl">Students</h2>
            {summary.students > 0 ? (
              <ButtonLink
                href={`/api/export/course/${id}/students`}
                variant="outline"
                size="sm"
              >
                Export CSV
              </ButtonLink>
            ) : null}
          </div>
          <p className="max-w-[62ch] text-text-muted">
            Click a student to open their full record: every course they are enrolled in,
            the individual lessons they have finished, and every quiz answer.
          </p>
          <CourseCohort insights={insights} />
        </section>
      </Container>
    </div>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1 bg-surface-raised p-5">
      <dd className="font-mono text-2xl tabular-nums text-text">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}
