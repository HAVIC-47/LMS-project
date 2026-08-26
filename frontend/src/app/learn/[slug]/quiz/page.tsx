import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmptyState, Panel } from '@/components/ui/primitives';
import { QuizRunner } from '@/components/learn/quiz-runner';
import { getCourseBySlug } from '@/lib/api/public';
import { getMyAttempts, getQuizToTake } from '@/lib/api/learn';
import { formatDate } from '@/lib/format';

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: 'Quiz' };

/**
 * Quiz page.
 *
 * The quiz arrives from `GET /api/quizzes/:id/take`, which strips `correctIndex` from every
 * question. There is no answer key anywhere in this page's props, its HTML, or the client
 * bundle: the only way to learn the answers is to submit and have the server grade you.
 */
export default async function QuizPage({ params }: PageProps) {
  const { slug } = await params;

  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const quizSummary = course.quizzes?.[0] ?? null;

  if (!quizSummary) {
    return (
      <EmptyState
        title="No quiz for this course"
        description="The instructor has not added a quiz here. Work through the lessons and your progress still counts."
      />
    );
  }

  const [quiz, attempts] = await Promise.all([
    getQuizToTake(quizSummary.documentId),
    getMyAttempts(),
  ]);

  if (!quiz) {
    notFound();
  }

  const status = quiz.attemptStatus;
  const previous = attempts.filter((attempt) => attempt.quiz?.documentId === quiz.documentId);
  const best = previous.reduce<number | null>(
    (highest, attempt) => (highest === null || attempt.score > highest ? attempt.score : highest),
    null
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="microlabel">Quiz</span>
        <h1 className="display-tight text-3xl font-semibold sm:text-4xl">{quiz.title}</h1>
        {quiz.description ? (
          <p className="max-w-[60ch] text-lg leading-relaxed text-text-muted">{quiz.description}</p>
        ) : null}
        <p className="text-sm text-text-muted">
          <span className="font-mono tabular-nums text-text">{quiz.questions.length}</span> questions.
          Pass mark <span className="font-mono tabular-nums text-text">{quiz.passingScore}%</span>.
          {best !== null ? (
            <>
              {' '}Your best so far{' '}
              <span className="font-mono tabular-nums text-text">{best}%</span>.
            </>
          ) : null}
        </p>

        {/* Stated before they start, not after the server refuses a submission. An
            uncapped quiz says nothing rather than "unlimited attempts", which would draw
            attention to a limit that does not exist. */}
        {status && status.maxAttempts > 0 ? (
          <p className="text-sm text-text-muted">
            <span className="font-mono tabular-nums text-text">{status.used}</span> of{' '}
            <span className="font-mono tabular-nums text-text">{status.maxAttempts}</span>{' '}
            attempts used
            {status.cooldownMinutes > 0 ? (
              <>
                , with {status.cooldownMinutes} minute
                {status.cooldownMinutes === 1 ? '' : 's'} between tries
              </>
            ) : null}
            .
          </p>
        ) : null}
      </header>

      {quiz.questions.length === 0 ? (
        <EmptyState
          title="This quiz has no questions yet"
          description="The instructor is still writing it. Check back once it is ready."
        />
      ) : status && !status.allowed ? (
        // The form is not rendered at all rather than rendered disabled. A disabled form
        // invites a reader to look for the way round it; an explanation does not.
        <EmptyState
          title="No attempts left"
          description={`${status.reason} Your recorded attempts are below.`}
        />
      ) : (
        <QuizRunner quiz={quiz} courseSlug={slug} />
      )}

      {previous.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Your attempts</h2>

          <Panel className="divide-y divide-line">
            {previous.map((attempt) => (
              <div
                key={attempt.documentId}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-lg tabular-nums text-text">{attempt.score}%</span>
                  <span className="text-sm text-text-muted">
                    {attempt.correctCount} of {attempt.totalQuestions} correct
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={
                      attempt.passed
                        ? 'microlabel text-success'
                        : 'microlabel text-text-subtle'
                    }
                  >
                    {attempt.passed ? 'Passed' : 'Not passed'}
                  </span>
                  <span className="microlabel">{formatDate(attempt.submittedAt)}</span>
                </div>
              </div>
            ))}
          </Panel>
        </section>
      ) : null}
    </div>
  );
}
