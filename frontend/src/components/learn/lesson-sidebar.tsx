'use client';

import Link from 'next/link';
import { CheckIcon, ListChecksIcon, PlayIcon, TextAlignLeftIcon } from '@phosphor-icons/react';
import { ProgressRail } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import type { LessonSummary, QuizSummary } from '@/lib/types';

/**
 * The course contents rail.
 *
 * Completion state is passed in from the server rather than tracked here, so it survives a
 * reload and cannot drift from the database. When a lesson is marked done the page calls
 * `router.refresh()` and this list re-renders from the new server data.
 */
export function LessonSidebar({
  slug,
  title,
  lessons,
  quiz,
  completedLessonIds,
  percentage,
  activeLessonId,
  quizActive = false,
}: {
  slug: string;
  title: string;
  lessons: LessonSummary[];
  quiz: QuizSummary | null;
  completedLessonIds: string[];
  percentage: number;
  activeLessonId?: string;
  quizActive?: boolean;
}) {
  const done = new Set(completedLessonIds);

  return (
    <nav aria-label="Course contents" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href={`/courses/${slug}`}
          className="text-sm font-medium text-text transition-colors hover:text-accent-text"
        >
          {title}
        </Link>
        <ProgressRail
          value={percentage}
          size="sm"
          label={`${done.size} of ${lessons.length} done`}
        />
      </div>

      <ol className="flex flex-col gap-0.5">
        {lessons.map((lesson, index) => {
          const isDone = done.has(lesson.documentId);
          const isActive = lesson.documentId === activeLessonId;

          return (
            <li key={lesson.documentId}>
              <Link
                href={`/learn/${slug}/${lesson.documentId}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-start gap-3 rounded-input px-3 py-2.5 text-sm transition-colors duration-200',
                  isActive ? 'bg-shell text-text' : 'text-text-muted hover:bg-shell hover:text-text'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-control',
                    isDone
                      ? 'bg-accent text-accent-ink-on'
                      : 'border border-line-strong text-transparent'
                  )}
                >
                  {isDone ? <CheckIcon size={10} weight="bold" /> : null}
                </span>

                <span className="font-mono text-[11px] tabular-nums leading-5 text-text-subtle">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="flex-1 leading-5">{lesson.title}</span>

                <span aria-hidden className="mt-0.5 shrink-0 text-text-subtle">
                  {lesson.contentType === 'video' ? (
                    <PlayIcon size={13} />
                  ) : (
                    <TextAlignLeftIcon size={13} />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {quiz ? (
        <div className="border-t border-line pt-4">
          <Link
            href={`/learn/${slug}/quiz`}
            aria-current={quizActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-input px-3 py-2.5 text-sm transition-colors duration-200',
              quizActive ? 'bg-shell text-text' : 'text-text-muted hover:bg-shell hover:text-text'
            )}
          >
            <ListChecksIcon size={16} className="shrink-0 text-accent-text" aria-hidden />
            <span className="flex-1">{quiz.title}</span>
            <span className="microlabel">Pass {quiz.passingScore}%</span>
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
