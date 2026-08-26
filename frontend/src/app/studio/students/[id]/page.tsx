import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, InfoIcon } from '@phosphor-icons/react/dist/ssr';
import { Avatar } from '@/components/ui/avatar';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Container } from '@/components/ui/primitives';
import { LearnerDetail, LearnerSummaryBar } from '@/components/studio/learner-detail';
import { getLearner } from '@/lib/api/learner';
import { requireRole } from '@/lib/guards';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS, ROLES } from '@/lib/types';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getLearner(id);

  if (!record) return { title: 'Student' };

  return { title: record.student.displayName || record.student.username };
}

/**
 * One student, in full.
 *
 * Reached by clicking a student's name anywhere staff can see a cohort. Everything about
 * that student — which courses they are enrolled in, how far into each, which individual
 * lessons they have finished and when, and every quiz answer — is on this one page rather
 * than spread across expanding rows in three different tables.
 *
 * The guard decides what is worth rendering; the backend decides what is reachable. An
 * instructor calling this gets the student filtered to their own courses, which is why the
 * page says so when `scoped` is set instead of implying it is the whole picture.
 */
export default async function StudentPage({ params }: Props) {
  await requireRole([ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR]);

  const { id } = await params;
  const record = await getLearner(id);

  if (!record) notFound();

  const { student, summary } = record;
  const name = student.displayName || student.username;

  return (
    <div className="py-12 lg:py-16">
      <Container className="flex flex-col gap-10">
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

        <header className="flex flex-col gap-8 border-b border-line pb-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar src={student.avatarUrl} name={name} size="xl" />

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="display-tight font-serif text-[2rem] font-normal sm:text-[2.5rem]">
                    {name}
                  </h1>
                  {student.role ? <Badge tone="accent">{ROLE_LABELS[student.role]}</Badge> : null}
                </div>

                <p className="text-sm text-text-muted">
                  {student.email} · joined {formatDate(student.joinedAt)}
                </p>
              </div>
            </div>

            <ButtonLink href={`/u/${student.username}`} variant="outline" size="sm">
              Public profile
            </ButtonLink>
          </div>

          {/* Said plainly rather than left to be inferred. An instructor seeing "1 course"
              should know that means one of *theirs*, not one in total. */}
          {record.scoped ? (
            <p className="flex items-start gap-2.5 rounded-card border border-line bg-surface px-4 py-3 text-sm text-text-muted">
              <InfoIcon size={16} aria-hidden className="mt-0.5 shrink-0" />
              You are seeing this student&rsquo;s work on the courses you own. Their progress
              elsewhere on the platform is not shown.
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-5">
            <Tile value={summary.courses} label="enrolled" />
            <Tile value={`${summary.overallCompletion}%`} label="overall" />
            <Tile
              value={`${summary.lessonsCompleted}/${summary.lessonsTotal}`}
              label="lessons done"
            />
            <Tile value={summary.attempts} label="quiz attempts" />
            <Tile
              value={summary.bestScore === null ? '—' : `${summary.bestScore}%`}
              label="best mark"
            />
          </dl>

          <LearnerSummaryBar record={record} />
        </header>

        <section className="flex flex-col gap-6">
          <p className="max-w-[62ch] text-text-muted">
            Open a card to see it in full — every lesson with the date it was completed, or
            every question with what was chosen against what was correct. The rest move to
            the side so you keep your place.
          </p>

          <LearnerDetail record={record} />
        </section>
      </Container>
    </div>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1 bg-surface-raised p-5">
      <dd className="font-mono text-xl tabular-nums text-text sm:text-2xl">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}
