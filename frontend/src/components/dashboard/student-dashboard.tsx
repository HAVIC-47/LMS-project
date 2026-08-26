import Link from 'next/link';
import { GraduationCapIcon, SealCheckIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, ProgressRail } from '@/components/ui/primitives';
import { BarChart, ChartCard, Ring, Sparkline, StackedBar } from '@/components/ui/charts';
import { formatDate } from '@/lib/format';
import { getMyEnrollments } from '@/lib/api/student';
import { getMyAttempts } from '@/lib/api/learn';
import { getMyCertificates } from '@/lib/api/extras';

/**
 * The student dashboard.
 *
 * It used to render the same list of course cards as My Courses, which made one of the two
 * pages redundant. The split is now by question rather than by data: **My Courses is where
 * you go to carry on, this is where you go to see how it is going.** Nothing here is a
 * launch point into a lesson; everything is a measurement.
 *
 * Every figure is computed from what the backend already returned for the two calls the
 * page makes anyway — progress per enrollment, and the attempt history. No third request,
 * and no numbers the server has not already vouched for.
 */
export async function StudentDashboard() {
  const [enrollments, attempts, certificates] = await Promise.all([
    getMyEnrollments(),
    getMyAttempts(),
    getMyCertificates(),
  ]);

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCapIcon size={32} aria-hidden />}
        title="Nothing to measure yet"
        description="Enroll in a course and this page will fill up with your completion and quiz results."
        action={
          <ButtonLink href="/courses" withArrow>
            Browse courses
          </ButtonLink>
        }
      />
    );
  }

  const lessonsDone = enrollments.reduce((sum, e) => sum + e.progress.completed, 0);
  const lessonsTotal = enrollments.reduce((sum, e) => sum + e.progress.total, 0);
  const overall = lessonsTotal === 0 ? 0 : Math.round((lessonsDone / lessonsTotal) * 100);

  const finished = enrollments.filter((e) => e.progress.percentage === 100).length;
  const started = enrollments.filter(
    (e) => e.progress.percentage > 0 && e.progress.percentage < 100
  ).length;
  const notStarted = enrollments.length - finished - started;

  const passed = attempts.filter((attempt) => attempt.passed).length;
  const averageScore =
    attempts.length === 0
      ? 0
      : Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length);
  const bestScore = attempts.length === 0 ? 0 : Math.max(...attempts.map((a) => a.score));

  // `getMyAttempts` returns newest first, which is the right order for a history list and
  // the wrong one for a trend line — a chart read left to right must run oldest to newest.
  const scoreTrend = [...attempts].reverse().map((attempt) => attempt.score);

  const completionBars = enrollments
    .slice()
    .sort((a, b) => b.progress.percentage - a.progress.percentage)
    .slice(0, 6)
    .map((enrollment) => ({
      label: enrollment.course.title,
      value: enrollment.progress.percentage,
      hint: `${enrollment.course.title}: ${enrollment.progress.completed} of ${enrollment.progress.total} lessons`,
    }));

  return (
    <div className="flex flex-col gap-8">
      {/* First, when there is one. The charts below measure progress; this is what progress
          was for, and burying the result under the working gets the order backwards. */}
      {certificates.length > 0 ? (
        <ChartCard
          title={certificates.length === 1 ? 'Certificate earned' : 'Certificates earned'}
          caption="Every lesson finished, and the quiz passed."
          action={
            <Link href="/my-courses" className="text-sm font-medium text-accent-text hover:underline">
              All of them
            </Link>
          }
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {certificates.slice(0, 4).map((certificate) => (
              <li key={certificate.serial}>
                <Link
                  href={`/certificates/${certificate.serial}`}
                  className="group flex h-full items-start gap-3 rounded-card border border-line bg-surface p-4 transition-[transform,border-color] duration-300 [transition-timing-function:var(--ease-settle)] hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <SealCheckIcon
                    size={18}
                    weight="fill"
                    aria-hidden
                    className="mt-0.5 shrink-0 text-accent"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-medium text-text transition-colors group-hover:text-accent-text">
                      {certificate.courseTitle}
                    </span>
                    <span className="font-mono text-xs tracking-wider text-text-subtle">
                      {certificate.serial}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ChartCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ChartCard
          title="Overall completion"
          caption={`${lessonsDone} of ${lessonsTotal} lessons across ${enrollments.length} ${
            enrollments.length === 1 ? 'course' : 'courses'
          }`}
        >
          <div className="flex flex-col items-center gap-6 py-2">
            <Ring value={overall} />
            <StackedBar
              className="w-full"
              segments={[
                { label: 'finished', value: finished, tone: 'accent' },
                { label: 'in progress', value: started, tone: 'muted' },
                { label: 'not started', value: notStarted, tone: 'faint' },
              ]}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Completion by course"
          caption="Your six furthest-along courses."
          action={
            <Link href="/my-courses" className="text-sm font-medium text-accent-text hover:underline">
              My courses
            </Link>
          }
        >
          <BarChart data={completionBars} max={100} suffix="%" />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ChartCard
          title="Quiz marks"
          caption={
            attempts.length === 0
              ? 'No quizzes taken yet.'
              : `${attempts.length} ${attempts.length === 1 ? 'attempt' : 'attempts'}, oldest to newest.`
          }
        >
          {attempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Sit a quiz and your marks will be plotted here.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <Sparkline values={scoreTrend} />

              <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-4">
                <Figure value={`${averageScore}%`} label="average" />
                <Figure value={`${bestScore}%`} label="best" />
                <Figure value={`${passed}/${attempts.length}`} label="passed" />
              </dl>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Recent results" caption="Your five most recent attempts.">
          {attempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col">
              {attempts.slice(0, 5).map((attempt) => (
                <li
                  key={attempt.documentId}
                  className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm text-text">
                      {attempt.quiz?.title ?? 'Quiz'}
                    </span>
                    <span className="text-xs text-text-subtle">
                      {formatDate(attempt.submittedAt)}
                    </span>
                  </div>

                  <span
                    className={
                      attempt.passed
                        ? 'shrink-0 rounded-control bg-accent px-2.5 py-1 font-mono text-xs tabular-nums text-accent-ink-on'
                        : 'shrink-0 rounded-control border border-line-strong px-2.5 py-1 font-mono text-xs tabular-nums text-text-muted'
                    }
                  >
                    {attempt.score}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Where you left off" caption="Sorted so unfinished work comes first.">
        <ul className="flex flex-col">
          {enrollments
            .slice()
            .sort((a, b) => a.progress.percentage - b.progress.percentage)
            .slice(0, 5)
            .map((enrollment) => (
              <li key={enrollment.documentId} className="border-b border-line py-4 last:border-b-0">
                <Link
                  href={`/learn/${enrollment.course.slug}`}
                  className="group flex flex-wrap items-center justify-between gap-4"
                >
                  <span className="font-medium text-text transition-colors group-hover:text-accent-text">
                    {enrollment.course.title}
                  </span>
                  <ProgressRail
                    className="w-full sm:w-64"
                    value={enrollment.progress.percentage}
                    label={`${enrollment.progress.completed} of ${enrollment.progress.total} lessons`}
                  />
                </Link>
              </li>
            ))}
        </ul>
      </ChartCard>
    </div>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dd className="font-mono text-2xl tabular-nums text-text">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}
