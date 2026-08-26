import Link from 'next/link';
import { ArrowUpRightIcon, BooksIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { BarChart, ChartCard, Ring, StackedBar } from '@/components/ui/charts';
import { getOwnedCourses } from '@/lib/api/staff';
import { getCourseInsights } from '@/lib/api/insights';

/**
 * The instructor dashboard.
 *
 * Built around one question — which of my courses needs attention — so the summary charts
 * come first and the per-course rows are ranked by the thing that would make you act:
 * enrolled students who are stuck.
 *
 * Course titles link to `/studio/courses/:id/insights`, not to the public course page. An
 * instructor clicking their own course from a dashboard wants the cohort, not the sales
 * pitch; the public page is one click further on from there.
 *
 * Insights for every course are fetched in parallel. Sequentially this would be one round
 * trip per course before the page could render at all.
 */
export async function InstructorDashboard() {
  const courses = await getOwnedCourses();

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<BooksIcon size={32} aria-hidden />}
        title="No courses yet"
        description="Create a course in the studio and this page will show how your students are doing with it."
        action={
          <ButtonLink href="/studio/courses/new" withArrow>
            Create a course
          </ButtonLink>
        }
      />
    );
  }

  const insights = await Promise.all(
    courses.map(async (course) => ({
      course,
      data: await getCourseInsights(course.documentId),
    }))
  );

  const rows = insights.map(({ course, data }) => ({
    documentId: course.documentId,
    title: course.title,
    isPublished: course.isPublished,
    lessons: course.lessonCount,
    quizzes: course.quizCount,
    students: data?.summary.students ?? course.enrollmentCount,
    averageCompletion: data?.summary.averageCompletion ?? 0,
    averageScore: data?.summary.averageScore ?? 0,
    finished: data?.summary.finished ?? 0,
    started: data?.summary.started ?? 0,
    notStarted: data?.summary.notStarted ?? 0,
    attempts: data?.summary.attempts ?? 0,
  }));

  const totalStudents = rows.reduce((sum, row) => sum + row.students, 0);
  const totalAttempts = rows.reduce((sum, row) => sum + row.attempts, 0);

  // Averaged over courses that actually have students. Including empty courses would drag
  // the figure toward zero and make a healthy cohort look like a failing one.
  const withStudents = rows.filter((row) => row.students > 0);
  const meanCompletion =
    withStudents.length === 0
      ? 0
      : Math.round(
          withStudents.reduce((sum, row) => sum + row.averageCompletion, 0) / withStudents.length
        );

  const scored = rows.filter((row) => row.attempts > 0);
  const meanScore =
    scored.length === 0
      ? 0
      : Math.round(scored.reduce((sum, row) => sum + row.averageScore, 0) / scored.length);

  const completionBars = rows
    .slice()
    .sort((a, b) => b.students - a.students)
    .slice(0, 6)
    .map((row) => ({ label: row.title, value: row.averageCompletion }));

  const enrolmentBars = rows
    .slice()
    .sort((a, b) => b.students - a.students)
    .slice(0, 6)
    .map((row) => ({ label: row.title, value: row.students }));

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        <Tile value={rows.length} label={rows.length === 1 ? 'course' : 'courses'} />
        <Tile value={totalStudents} label="students enrolled" />
        <Tile value={`${meanCompletion}%`} label="mean completion" />
        <Tile value={totalAttempts} label="quiz attempts" />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <ChartCard
          title="Cohort progress"
          caption="Every enrolled student across all your courses."
        >
          <div className="flex flex-col items-center gap-6 py-2">
            <Ring value={meanCompletion} label="Mean completion" caption={`${meanScore}% mean quiz mark`} />
            <StackedBar
              className="w-full"
              segments={[
                {
                  label: 'finished',
                  value: rows.reduce((sum, row) => sum + row.finished, 0),
                  tone: 'accent',
                },
                {
                  label: 'in progress',
                  value: rows.reduce((sum, row) => sum + row.started, 0),
                  tone: 'muted',
                },
                {
                  label: 'not started',
                  value: rows.reduce((sum, row) => sum + row.notStarted, 0),
                  tone: 'faint',
                },
              ]}
            />
          </div>
        </ChartCard>

        <div className="flex flex-col gap-6">
          <ChartCard title="Average completion by course" caption="Your six largest cohorts.">
            <BarChart data={completionBars} max={100} suffix="%" height={110} />
          </ChartCard>

          <ChartCard title="Enrolment by course" caption="Where your students actually are.">
            <BarChart data={enrolmentBars} height={110} />
          </ChartCard>
        </div>
      </div>

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl">Your courses</h2>
          <Link href="/studio" className="text-sm font-medium text-accent-text hover:underline">
            Open the studio
          </Link>
        </div>

        <ul className="flex flex-col">
          {rows
            .slice()
            // Most students first: the course with the biggest cohort is the one where a
            // problem affects the most people.
            .sort((a, b) => b.students - a.students)
            .map((row) => (
              <li key={row.documentId}>
                <Link
                  href={`/studio/courses/${row.documentId}/insights`}
                  className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line py-5 transition-colors duration-300 [transition-timing-function:var(--ease-settle)] last:border-b hover:border-line-strong"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text transition-colors group-hover:text-accent-text">
                        {row.title}
                      </span>
                      {row.isPublished ? null : <Badge tone="neutral">Draft</Badge>}
                      <ArrowUpRightIcon
                        size={14}
                        aria-hidden
                        className="-translate-x-1 opacity-0 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </span>
                    <span className="text-sm text-text-subtle">
                      {row.lessons} lessons · {row.quizzes} quizzes · {row.attempts} attempts
                    </span>
                  </div>

                  <dl className="flex items-center gap-8 text-sm">
                    <Cell value={row.students} label="students" />
                    <Cell value={`${row.averageCompletion}%`} label="completion" />
                    <Cell
                      value={row.attempts === 0 ? '—' : `${row.averageScore}%`}
                      label="mean mark"
                    />
                  </dl>
                </Link>
              </li>
            ))}
        </ul>
      </section>
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

function Cell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <dd className="font-mono tabular-nums text-text">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}
