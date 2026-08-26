'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/avatar';
import { ProgressRail } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import type { CourseInsights, InsightStudent } from '@/lib/api/insights';

/**
 * The cohort table for one course.
 *
 * Rows used to expand in place to reveal a student's marked answers. They are now links to
 * that student's own page, which carries the same answers plus everything the expansion
 * could not: their other courses, their individual lesson completions, and every attempt
 * rather than only the ones on this course. Keeping both would have meant two places
 * showing the same marking, drifting apart.
 *
 * Still a Client Component, for the search box and the sort control. Both work on data
 * already fetched on the server, so neither costs a round trip.
 */

type SortKey = 'progress' | 'name' | 'score' | 'enrolled';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'progress', label: 'Progress' },
  { key: 'score', label: 'Best mark' },
  { key: 'name', label: 'Name' },
  { key: 'enrolled', label: 'Enrolled' },
];

export function CourseCohort({ insights }: { insights: CourseInsights }) {
  const [sort, setSort] = useState<SortKey>('progress');
  const [query, setQuery] = useState('');

  const students = useMemo(() => {
    const term = query.trim().toLowerCase();

    const filtered = term
      ? insights.students.filter(
          (student) =>
            student.username.toLowerCase().includes(term) ||
            (student.displayName ?? '').toLowerCase().includes(term) ||
            student.email.toLowerCase().includes(term)
        )
      : insights.students;

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
  }, [insights.students, query, sort]);

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a student"
          aria-label="Find a student"
          className="h-11 w-full max-w-xs rounded-input border border-line-strong bg-surface-raised px-4 text-base text-text placeholder:text-text-subtle focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
        />

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
          No student matches “{query}”.
        </p>
      ) : (
        <ul className="flex flex-col">
          {students.map((student) => (
            <li key={student.id} className="border-t border-line last:border-b">
              <Link
                href={`/studio/students/${student.id}`}
                className="group flex flex-wrap items-center gap-x-6 gap-y-4 py-4 transition-colors duration-200 hover:bg-surface"
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
                  className="w-full sm:w-52"
                  value={student.progress.percentage}
                  label={`${student.progress.completed} of ${student.progress.total} lessons`}
                />

                <div className="flex w-24 flex-col items-end gap-0.5">
                  <span className="font-mono tabular-nums text-text">
                    {student.bestScore === null ? '—' : `${student.bestScore}%`}
                  </span>
                  <span className="microlabel">best mark</span>
                </div>

                <div className="flex w-20 flex-col items-end gap-0.5">
                  <span className="font-mono tabular-nums text-text">
                    {student.attempts.length}
                  </span>
                  <span className="microlabel">attempts</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
