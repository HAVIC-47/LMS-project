'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowsInSimpleIcon,
  CheckCircleIcon,
  CircleIcon,
  ListChecksIcon,
  StackIcon,
  XIcon,
} from '@phosphor-icons/react';
import { ProgressRail } from '@/components/ui/primitives';
import { Ring, StackedBar } from '@/components/ui/charts';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { LearnerRecord, LearnerAttempt, LearnerCourse } from '@/lib/api/learner';

/**
 * A learner's record, as expanding cards.
 *
 * Two modes, one component. Closed, the cards sit in a grid and can be scanned. Opened,
 * the chosen card takes the bulk of the screen and the rest collapse into a rail down the
 * side — so the reader keeps their place in the set while reading one item in full, which
 * a modal would take away and a separate page would take away twice.
 *
 * `layout` on the motion of it is deliberately *not* used: the grid-to-split transition
 * moves cards between two different flex/grid contexts, and animating that reliably costs
 * more complexity than it buys. The panels cross-fade instead, which is honest about the
 * fact that the layout changed.
 *
 * Everything is already loaded. Opening a card triggers no request, so a reader can move
 * through eight courses without a spinner between them.
 */

type Tab = 'courses' | 'quizzes';

export function LearnerDetail({ record }: { record: LearnerRecord }) {
  const [tab, setTab] = useState<Tab>('courses');
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);

  const attemptsByCourse = useMemo(() => {
    const map = new Map<string, LearnerAttempt[]>();
    for (const attempt of record.attempts) {
      const key = attempt.course?.documentId ?? 'unknown';
      const list = map.get(key) ?? [];
      list.push(attempt);
      map.set(key, list);
    }
    return map;
  }, [record.attempts]);

  return (
    <div className="flex flex-col gap-8">
      {/* The "track quiz" control. A pair of tabs rather than a button that reveals a
          second list, so it is always obvious which of the two sets you are looking at. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <TabButton
          active={tab === 'courses'}
          onClick={() => setTab('courses')}
          icon={<StackIcon size={16} aria-hidden />}
          label="Courses"
          count={record.courses.length}
        />
        <TabButton
          active={tab === 'quizzes'}
          onClick={() => setTab('quizzes')}
          icon={<ListChecksIcon size={16} aria-hidden />}
          label="Track quizzes"
          count={record.attempts.length}
        />
      </div>

      {tab === 'courses' ? (
        <ExpandingSet
          items={record.courses.map((course) => ({
            id: course.documentId,
            title: course.title,
            meta: `${course.progress.completed} of ${course.progress.total} lessons`,
            value: course.progress.percentage,
          }))}
          openId={openCourse}
          onOpen={setOpenCourse}
          emptyMessage="This student is not enrolled in any course you manage."
          renderDetail={(id) => {
            const course = record.courses.find((c) => c.documentId === id);
            if (!course) return null;
            return (
              <CoursePanel
                course={course}
                attempts={attemptsByCourse.get(course.documentId) ?? []}
              />
            );
          }}
        />
      ) : (
        <ExpandingSet
          items={record.attempts.map((attempt) => ({
            id: attempt.documentId,
            title: attempt.quiz?.title ?? 'Quiz',
            meta: `${attempt.course?.title ?? 'Course'} · ${formatDate(attempt.submittedAt)}`,
            value: attempt.score,
            tone: attempt.passed ? 'pass' : 'fail',
          }))}
          openId={openAttempt}
          onOpen={setOpenAttempt}
          emptyMessage="This student has not sat a quiz on any course you manage."
          renderDetail={(id) => {
            const attempt = record.attempts.find((a) => a.documentId === id);
            return attempt ? <AttemptPanel attempt={attempt} /> : null;
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- the expanding set ---- */

type Item = {
  id: string;
  title: string;
  meta: string;
  /** A percentage, shown on the card face. */
  value: number;
  tone?: 'pass' | 'fail';
};

/**
 * Cards that expand by growing, not by swapping layouts.
 *
 * The same technique as the blog index: one flex line, and only `flex-grow` transitions.
 * The detail panel and the card rail are always both present; opening a card raises the
 * panel's grow from 0 to 3, and because the flex algorithm re-solves the line every frame
 * the rail gives up its width smoothly without a tween of its own.
 *
 * Two consequences worth stating, because they are what make it work rather than incidental:
 *
 *   - The rail lays its cards out with `auto-fill`, so as it narrows from full width to a
 *     quarter it re-columns from four across down to one. No breakpoint decides that; the
 *     available width does, continuously, which is why it stays in step with the animation.
 *   - The panel keeps rendering its contents while it collapses. Unmounting on close would
 *     shrink an empty box, which reads as the panel being destroyed rather than put away.
 */
function ExpandingSet({
  items,
  openId,
  onOpen,
  renderDetail,
  emptyMessage,
}: {
  items: Item[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  renderDetail: (id: string) => React.ReactNode;
  emptyMessage: string;
}) {
  const open = openId && items.some((item) => item.id === openId) ? openId : null;

  // Trails `open` by the length of the collapse, so the panel still has something in it on
  // the way out. Cleared by a timer rather than a transitionend listener: `flex-grow` fires
  // on the animating element, and a missed event would strand the panel populated forever.
  const [displayId, setDisplayId] = useState<string | null>(open);

  useEffect(() => {
    if (open) {
      setDisplayId(open);
      return;
    }

    const timer = setTimeout(() => setDisplayId(null), 500);
    return () => clearTimeout(timer);
  }, [open]);

  if (items.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-text-muted">
        {emptyMessage}
      </p>
    );
  }

  const shown = displayId && items.some((item) => item.id === displayId) ? displayId : null;
  const detail = shown ? items.find((item) => item.id === shown) : null;
  const rail = shown ? items.filter((item) => item.id !== shown) : items;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <section
        // Hidden outright on a phone when closed: `flex-grow` governs the main axis, and
        // stacked vertically that is height, so a zero-grow item would still take its
        // content's width and sit there as an empty card.
        className={cn(
          'min-w-0 overflow-hidden rounded-card lg:basis-0',
          'lg:motion-safe:transition-[flex-grow] lg:motion-safe:duration-500',
          // See the note on the blog index: the `ease-*` utility sets the variable that
          // `transition-*` reads, where a raw `transition-timing-function` declaration
          // ties with it on specificity and loses on order.
          'lg:ease-[var(--ease-settle)]',
          open
            ? 'border border-line-strong bg-surface-raised shadow-[var(--shadow-lifted)]'
            : 'hidden lg:block'
        )}
        style={{ flexGrow: open ? 3 : 0 }}
        aria-hidden={!open}
        data-expand-panel
      >
        {detail ? (
          <div className="flex min-h-[32rem] w-full flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-line p-6">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-serif text-2xl leading-snug text-text">{detail.title}</h3>
                <p className="text-sm text-text-muted">{detail.meta}</p>
              </div>

              <button
                type="button"
                onClick={() => onOpen(null)}
                aria-label="Close and show all"
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors duration-200 hover:bg-shell hover:text-text"
              >
                <ArrowsInSimpleIcon size={17} aria-hidden />
              </button>
            </header>

            <div className="flex-1 p-6">{renderDetail(shown as string)}</div>
          </div>
        ) : null}
      </section>

      <div data-expand-rail className="flex min-w-0 flex-1 flex-col gap-3">
        {open ? <p className="microlabel">{rail.length} more</p> : null}

        <ul
          // `auto-fill` rather than a fixed column count: the rail is asked to be full
          // width one moment and a quarter of it the next, and this lets the same list
          // answer both without a breakpoint being told about the animation.
          className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]"
        >
          {rail.map((item) => (
            <li key={item.id}>
              <CardFace item={item} onClick={() => onOpen(item.id)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


function CardFace({ item, onClick }: { item: Item; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-full w-full cursor-pointer flex-col gap-4 rounded-card border bg-surface-raised p-6 text-left',
        'transition-[transform,border-color,box-shadow] duration-300 [transition-timing-function:var(--ease-settle)]',
        'hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]',
        item.tone === 'fail' ? 'border-line' : 'border-line'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-serif text-lg leading-snug text-text transition-colors group-hover:text-accent-text">
          {item.title}
        </h3>

        {item.tone ? (
          <span
            className={cn(
              'shrink-0 rounded-control px-2.5 py-1 font-mono text-xs tabular-nums',
              item.tone === 'pass'
                ? 'bg-accent text-accent-ink-on'
                : 'border border-line-strong text-text-muted'
            )}
          >
            {item.value}%
          </span>
        ) : null}
      </div>

      <p className="line-clamp-2 text-sm text-text-muted">{item.meta}</p>

      <div className="mt-auto">
        <ProgressRail
          value={item.value}
          label={item.tone ? undefined : `${item.value}% complete`}
        />
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------- the panels ----- */

/** One course in full: every lesson, marked done or not, plus that course's quizzes. */
function CoursePanel({
  course,
  attempts,
}: {
  course: LearnerCourse;
  attempts: LearnerAttempt[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-8">
        <Ring value={course.progress.percentage} size={112} />

        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Figure value={course.progress.completed} label="lessons done" />
          <Figure value={course.progress.total - course.progress.completed} label="remaining" />
          <Figure value={attempts.length} label="quiz attempts" />
          <Figure value={formatDate(course.enrolledAt)} label="enrolled" />
        </dl>
      </div>

      <section className="flex flex-col gap-3">
        <h4 className="microlabel">Lessons</h4>
        <ol className="flex flex-col">
          {course.lessons.map((lesson) => (
            <li
              key={lesson.documentId}
              className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
            >
              {lesson.completed ? (
                <CheckCircleIcon
                  size={18}
                  weight="fill"
                  aria-hidden
                  className="shrink-0 text-accent"
                />
              ) : (
                <CircleIcon size={18} aria-hidden className="shrink-0 text-line-strong" />
              )}

              <span className="font-mono text-xs tabular-nums text-text-subtle">
                {String(lesson.order).padStart(2, '0')}
              </span>

              <span
                className={cn(
                  'flex-1 text-sm',
                  lesson.completed ? 'text-text' : 'text-text-muted'
                )}
              >
                {lesson.title}
              </span>

              <span className="shrink-0 text-xs text-text-subtle">
                {lesson.completedAt ? formatDate(lesson.completedAt) : '—'}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {attempts.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h4 className="microlabel">Quiz attempts on this course</h4>
          <ul className="flex flex-col gap-2">
            {attempts.map((attempt) => (
              <li
                key={attempt.documentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
              >
                <span className="text-sm text-text">{attempt.quiz?.title ?? 'Quiz'}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-text-subtle">
                    {formatDate(attempt.submittedAt)}
                  </span>
                  <span
                    className={cn(
                      'rounded-control px-2.5 py-1 font-mono text-xs tabular-nums',
                      attempt.passed
                        ? 'bg-accent text-accent-ink-on'
                        : 'border border-line-strong text-text-muted'
                    )}
                  >
                    {attempt.score}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** One attempt in full: every question, what they chose, what was right. */
function AttemptPanel({ attempt }: { attempt: LearnerAttempt }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-8">
        <Ring value={attempt.score} size={112} />

        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Figure value={`${attempt.correctCount}/${attempt.totalQuestions}`} label="correct" />
          <Figure value={attempt.passed ? 'Pass' : 'Fail'} label="outcome" />
          <Figure value={`${attempt.quiz?.passingScore ?? 60}%`} label="pass mark" />
          <Figure value={formatDate(attempt.submittedAt)} label="submitted" />
        </dl>
      </div>

      {attempt.course ? (
        <p className="text-sm text-text-muted">
          Part of{' '}
          <Link
            href={`/courses/${attempt.course.slug}`}
            className="text-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
          >
            {attempt.course.title}
          </Link>
          .
        </p>
      ) : null}

      <ol className="flex flex-col gap-6">
        {attempt.answers.map((answer, index) => (
          <li key={`${answer.questionId}-${index}`} className="flex flex-col gap-2.5">
            <div className="flex gap-3">
              <span className="mt-0.5 font-mono text-xs tabular-nums text-text-subtle">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="flex-1 text-sm font-medium text-text">{answer.prompt}</p>
            </div>

            <ul className="ml-8 flex flex-col gap-1.5">
              {answer.options.map((option, optionIndex) => {
                const chosen = answer.selectedIndex === optionIndex;
                const correct = answer.correctIndex === optionIndex;

                return (
                  <li
                    key={optionIndex}
                    className={cn(
                      'flex items-center gap-2 rounded-control border px-3 py-2 text-sm',
                      correct
                        ? 'border-accent bg-accent-soft text-text'
                        : chosen
                          ? 'border-danger text-text'
                          : 'border-line text-text-subtle'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-full border',
                        correct
                          ? 'border-accent bg-accent text-accent-ink-on'
                          : chosen
                            ? 'border-danger bg-danger text-page'
                            : 'border-line-strong'
                      )}
                    >
                      {correct ? <CheckCircleIcon size={10} weight="fill" aria-hidden /> : null}
                      {!correct && chosen ? <XIcon size={9} weight="bold" aria-hidden /> : null}
                    </span>

                    <span className="flex-1">{option}</span>
                    {chosen ? <span className="microlabel shrink-0">their answer</span> : null}
                  </li>
                );
              })}
            </ul>

            {answer.selectedIndex === null ? (
              <p className="ml-8 text-sm text-text-subtle">Left unanswered.</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* --------------------------------------------------------------------- fragments ----- */

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-control px-4 py-2.5 text-sm transition-colors duration-200',
        active
          ? 'bg-accent text-accent-ink-on'
          : 'text-text-muted hover:bg-shell hover:text-text'
      )}
    >
      {icon}
      {label}
      <span className="font-mono text-xs tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dd className="font-mono text-xl tabular-nums text-text">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}

/** Exported for the page header, which needs the same distribution bar. */
export function LearnerSummaryBar({ record }: { record: LearnerRecord }) {
  return (
    <StackedBar
      segments={[
        { label: 'finished', value: record.summary.finished, tone: 'accent' },
        { label: 'in progress', value: record.summary.inProgress, tone: 'muted' },
        { label: 'not started', value: record.summary.notStarted, tone: 'faint' },
      ]}
    />
  );
}
