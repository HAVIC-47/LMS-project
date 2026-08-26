'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRightIcon, UserMinusIcon } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/avatar';
import { ProgressRail } from '@/components/ui/primitives';
import { FormError } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { matches } from '@/lib/list-filters';
import { ManageError, removeStudentFromCourse } from '@/lib/manage';
import type { CourseInsights, InsightStudent } from '@/lib/api/insights';

/**
 * The cohort table for one course.
 *
 * Rows link to each student's own record, which carries their marked answers, their other
 * courses and their individual lesson completions. Keeping an in-place expansion here as
 * well would mean two places showing the same marking, drifting apart.
 *
 * Search, filters and sorting are all client-side here, unlike the list pages, and
 * deliberately so: the whole cohort arrived with the page. A round trip to reorder rows the
 * browser is already holding would be latency bought for nothing.
 */

type SortKey = 'progress' | 'name' | 'score' | 'enrolled';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'progress', label: 'Progress' },
  { key: 'score', label: 'Best mark' },
  { key: 'name', label: 'Name' },
  { key: 'enrolled', label: 'Enrolled' },
];

const PROGRESS_FILTERS = {
  '': 'Any progress',
  'not-started': 'Not started',
  'in-progress': 'In progress',
  finished: 'Finished',
} as const;

const QUIZ_FILTERS = {
  '': 'Any quiz result',
  passed: 'Passed a quiz',
  failed: 'Attempted, never passed',
  none: 'No attempt yet',
} as const;

type ProgressFilter = keyof typeof PROGRESS_FILTERS;
type QuizFilter = keyof typeof QUIZ_FILTERS;

export function CourseCohort({ insights }: { insights: CourseInsights }) {
  const [sort, setSort] = useState<SortKey>('progress');
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<ProgressFilter>('');
  const [quiz, setQuiz] = useState<QuizFilter>('');

  // A removed student is dropped locally as well as on the server. `router.refresh()`
  // re-fetches the page, but until that lands the row would sit there looking as though
  // the click did nothing.
  const [removed, setRemoved] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const students = useMemo(() => {
    const pool = insights.students.filter((student) => !removed.includes(student.id));

    const filtered = pool.filter((student) => {
      const percent = student.progress.percentage;

      if (progress === 'not-started' && percent !== 0) return false;
      if (progress === 'in-progress' && (percent === 0 || percent === 100)) return false;
      if (progress === 'finished' && percent !== 100) return false;

      const attempted = student.attempts.length > 0;
      const passed = student.attempts.some((attempt) => attempt.passed);

      if (quiz === 'passed' && !passed) return false;
      // "Attempted, never passed" is the group worth finding — a student who has not sat
      // the quiz at all is a different problem and has its own option.
      if (quiz === 'failed' && (!attempted || passed)) return false;
      if (quiz === 'none' && attempted) return false;

      return matches(query, student.username, student.displayName, student.email);
    });

    const nameOf = (student: InsightStudent) =>
      (student.displayName || student.username).toLowerCase();

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name':
          return nameOf(a).localeCompare(nameOf(b));
        case 'score':
          // Nulls last: a student who has not sat a quiz has no mark, which is not the
          // same as a mark of zero and must not sort alongside one.
          if (a.bestScore === null && b.bestScore === null) return 0;
          if (a.bestScore === null) return 1;
          if (b.bestScore === null) return -1;
          return b.bestScore - a.bestScore;
        case 'enrolled':
          return new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime();
        default:
          return b.progress.percentage - a.progress.percentage;
      }
    });
  }, [insights.students, query, sort, progress, quiz, removed]);

  const unenroll = async (student: InsightStudent) => {
    const name = student.displayName || student.username;

    // Spelled out rather than a generic "are you sure": what happens to their progress and
    // what happens to their marks are the two things somebody needs to know before saying
    // yes, and they are not guessable from the button.
    if (
      !window.confirm(
        `Remove ${name} from this course?\n\nTheir progress on these lessons is cleared. Their quiz results are kept.`
      )
    ) {
      return;
    }

    setBusy(student.id);
    setError(null);

    try {
      await removeStudentFromCourse(insights.course.documentId, student.id);
      setRemoved((current) => [...current, student.id]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ManageError ? caught.message : 'Could not remove that student.');
    } finally {
      setBusy(null);
    }
  };

  if (insights.students.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-text-muted">
        Nobody is enrolled yet. Once students join, their progress and quiz answers appear
        here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <FormError>{error}</FormError> : null}

      {/* Search and both filters share one row: they are the same question asked three
          ways — which students am I looking at — and splitting them across lines made the
          quiz filter read as though it belonged to the sort control beside it. The search
          flexes, the selects size to their content, so the row holds together as it
          narrows instead of the last control dropping away on its own. */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search students"
          aria-label="Search students by name or email"
          className="h-11 min-w-0 flex-1 rounded-input border border-line-strong bg-surface-raised px-4 text-base text-text placeholder:text-text-subtle focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 sm:max-w-xs"
        />

        <Select
          label="Filter by progress"
          value={progress}
          options={PROGRESS_FILTERS}
          onChange={(value) => setProgress(value as ProgressFilter)}
        />

        <Select
          label="Filter by quiz result"
          value={quiz}
          options={QUIZ_FILTERS}
          onChange={(value) => setQuiz(value as QuizFilter)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-text-muted">
          {students.length} {students.length === 1 ? 'student' : 'students'}
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <span className="microlabel mr-1">Sort</span>
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSort(option.key)}
              aria-pressed={sort === option.key}
              className={cn(
                'cursor-pointer rounded-control px-3 py-1.5 text-sm transition-colors duration-200',
                sort === option.key
                  ? 'bg-accent text-accent-ink-on'
                  : 'text-text-muted hover:bg-shell hover:text-text'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {students.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          No student matches those filters.
        </p>
      ) : (
        <ul className="flex flex-col">
          {students.map((student) => (
            <li
              key={student.id}
              className="flex items-center gap-3 border-t border-line last:border-b"
            >
              {/* The row link and the remove button are siblings. A button nested inside an
                  anchor is invalid markup, and the browser resolves it by dropping one of
                  the two — usually the one that was wanted. */}
              <Link
                href={`/studio/students/${student.id}`}
                className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-4 py-4 transition-colors duration-200 hover:bg-surface"
              >
                <Avatar
                  src={student.avatarUrl}
                  name={student.displayName || student.username}
                  size="md"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 truncate font-medium text-text transition-colors group-hover:text-accent-text">
                    {student.displayName || student.username}
                    <ArrowUpRightIcon
                      size={13}
                      aria-hidden
                      className="shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </span>
                  <span className="truncate text-sm text-text-subtle">{student.email}</span>
                </div>

                <ProgressRail
                  className="w-full sm:w-44"
                  value={student.progress.percentage}
                  label={`${student.progress.completed} of ${student.progress.total} lessons`}
                />

                <div className="flex w-20 flex-col items-end gap-0.5">
                  <span className="font-mono tabular-nums text-text">
                    {student.bestScore === null ? '—' : `${student.bestScore}%`}
                  </span>
                  <span className="microlabel">best mark</span>
                </div>

                <div className="flex w-16 flex-col items-end gap-0.5">
                  <span className="font-mono tabular-nums text-text">
                    {student.attempts.length}
                  </span>
                  <span className="microlabel">attempts</span>
                </div>
              </Link>

              {/* Labelled, not an icon on its own. This is the one destructive control on
                  the page and a bare icon asks the reader to guess which destruction. */}
              <button
                type="button"
                onClick={() => unenroll(student)}
                disabled={busy === student.id}
                aria-label={`Un-enroll ${student.displayName || student.username} from this course`}
                className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border border-line px-2.5 text-xs font-medium text-text-subtle transition-colors duration-200 hover:border-danger hover:bg-danger-soft hover:text-danger disabled:opacity-40"
              >
                <UserMinusIcon size={14} aria-hidden />
                {busy === student.id ? 'Removing…' : 'Un-enroll'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-input border border-line-strong bg-surface-raised px-3 text-sm text-text focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
