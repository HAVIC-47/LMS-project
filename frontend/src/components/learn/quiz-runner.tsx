'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, CircleIcon, SealCheckIcon, XCircleIcon } from '@phosphor-icons/react';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { Panel, ProgressRail } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import type { StudentQuiz } from '@/lib/api/learn';

type Result = {
  attemptId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  breakdown: {
    questionId: string;
    selectedIndex: number | null;
    correctIndex: number;
    isCorrect: boolean;
  }[];
  /** Non-null only on the attempt that completed the course. */
  certificate: { serial: string } | null;
  /** Recomputed after this attempt, so the screen can say how many tries are left. */
  attemptStatus: {
    used: number;
    maxAttempts: number;
    remaining: number | null;
    allowed: boolean;
    reason: string;
  } | null;
};

/**
 * Quiz runner.
 *
 * All questions on one page rather than one at a time: these are short knowledge checks,
 * and being able to skip ahead and come back is worth more than the ceremony of a wizard.
 *
 * The component holds only the selections. It has no idea which option is correct, because
 * the backend strips `correctIndex` from the quiz it serves. The answer key arrives for
 * the first time in the grading response, once the attempt is already recorded, so there
 * is nothing in memory to inspect before submitting.
 */
export function QuizRunner({ quiz, courseSlug }: { quiz: StudentQuiz; courseSlug: string }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const router = useRouter();

  const questions = quiz.questions;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  const select = (questionId: string, index: number) => {
    if (result) return;
    setAnswers((current) => ({ ...current, [questionId]: index }));
  };

  const submit = async () => {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/quiz/${quiz.documentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.documentId,
            selectedIndex: answers[question.documentId] ?? null,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'Could not submit your answers.');
        return;
      }

      setResult(payload.data as Result);
      // Refresh so the attempt history below the quiz picks up this submission.
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  const correctFor = (questionId: string) =>
    result?.breakdown.find((entry) => entry.questionId === questionId);

  return (
    <div className="flex flex-col gap-8">
      {result ? <ScoreCard result={result} passMark={quiz.passingScore} slug={courseSlug} /> : null}

      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => {
          const selected = answers[question.documentId];
          const graded = correctFor(question.documentId);

          return (
            <li key={question.documentId}>
              <Panel className="flex flex-col gap-5 p-6">
                <div className="flex items-start gap-3">
                  <span className="mt-1 font-mono text-xs tabular-nums text-text-subtle">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-medium leading-snug text-text">{question.prompt}</h3>
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">{question.prompt}</legend>

                  {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isRight = graded && optionIndex === graded.correctIndex;
                    const isWrongPick = graded && isSelected && !graded.isCorrect;

                    return (
                      <label
                        key={optionIndex}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-input border px-4 py-3 text-sm transition-colors duration-200',
                          // After grading, colour is paired with an icon so the outcome is
                          // never conveyed by colour alone.
                          isRight
                            ? 'border-success/40 bg-success-soft text-success'
                            : isWrongPick
                              ? 'border-danger/40 bg-danger-soft text-danger'
                              : isSelected
                                ? 'border-accent bg-accent-soft text-text'
                                : 'border-line text-text-muted hover:border-line-strong hover:text-text',
                          result && 'cursor-default'
                        )}
                      >
                        <input
                          type="radio"
                          name={question.documentId}
                          value={optionIndex}
                          checked={isSelected ?? false}
                          onChange={() => select(question.documentId, optionIndex)}
                          disabled={Boolean(result)}
                          className="sr-only"
                        />

                        <span aria-hidden className="shrink-0">
                          {isRight ? (
                            <CheckCircleIcon size={18} weight="fill" />
                          ) : isWrongPick ? (
                            <XCircleIcon size={18} weight="fill" />
                          ) : isSelected ? (
                            <span className="flex size-[18px] items-center justify-center rounded-control border-2 border-accent">
                              <span className="size-2 rounded-control bg-accent" />
                            </span>
                          ) : (
                            <CircleIcon size={18} />
                          )}
                        </span>

                        <span className="flex-1">{option}</span>
                      </label>
                    );
                  })}
                </fieldset>
              </Panel>
            </li>
          );
        })}
      </ol>

      {error ? <FormError>{error}</FormError> : null}

      {result ? (
        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          <ButtonLink href={`/learn/${courseSlug}`} withArrow>
            Back to the course
          </ButtonLink>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <Button size="lg" onClick={submit} loading={pending} disabled={!allAnswered}>
            Submit answers
          </Button>
          <p className="text-sm text-text-muted">
            <span className="font-mono tabular-nums text-text">{answeredCount}</span> of{' '}
            <span className="font-mono tabular-nums text-text">{questions.length}</span> answered
            {allAnswered ? '' : '. Answer them all to submit.'}
          </p>
        </div>
      )}
    </div>
  );
}

/** The score, shown the moment the server returns it. */
function ScoreCard({
  result,
  passMark,
  slug,
}: {
  result: Result;
  passMark: number;
  slug: string;
}) {
  return (
    <Panel className="flex flex-col gap-5 p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="microlabel">{result.passed ? 'Passed' : 'Not passed'}</span>
          <p className="font-mono text-5xl tabular-nums text-text">{result.score}%</p>
        </div>

        <p className="text-sm text-text-muted">
          <span className="font-mono tabular-nums text-text">{result.correctCount}</span> of{' '}
          <span className="font-mono tabular-nums text-text">{result.totalQuestions}</span> correct.
          Pass mark <span className="font-mono tabular-nums">{passMark}%</span>.
        </p>
      </div>

      <ProgressRail value={result.score} size="sm" />

      <p className="text-sm text-text-muted">
        {result.passed
          ? 'Your result is saved. You can review the marked answers below.'
          : 'Your result is saved. The correct answers are marked below.'}
      </p>

      {/*
        The moment a course is finished is the moment to say so. The API has always returned
        the certificate on the attempt that earned it; before this the screen dropped it on
        the floor, and the student found out only by scrolling past their attempt history on
        another page later.
      */}
      {result.certificate ? (
        <div className="flex flex-col gap-3 rounded-card border border-accent bg-accent-soft p-5">
          <span className="flex items-center gap-2">
            <SealCheckIcon size={18} weight="fill" aria-hidden className="text-accent-text" />
            <span className="microlabel">Course complete</span>
          </span>

          <p className="text-sm leading-relaxed text-text">
            That was the last thing outstanding — your certificate has been issued.
          </p>

          <a
            href={`/certificates/${result.certificate.serial}`}
            className="w-fit text-sm font-medium text-accent-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
          >
            View certificate {result.certificate.serial}
          </a>
        </div>
      ) : null}

      {/* Retaking is only offered when there is an attempt left to take. A link that leads
          to a refusal is worse than no link. */}
      {result.attemptStatus && !result.attemptStatus.allowed ? (
        <p className="text-sm text-text-subtle">{result.attemptStatus.reason}</p>
      ) : (
        <a href={`/learn/${slug}/quiz`} className="text-sm font-medium text-accent-text">
          Take it again
          {result.attemptStatus?.remaining !== null && result.attemptStatus
            ? ` (${result.attemptStatus.remaining} left)`
            : ''}
        </a>
      )}
    </Panel>
  );
}
