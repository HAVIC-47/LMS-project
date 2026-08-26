import type { Metadata } from 'next';
import Link from 'next/link';
import { BooksIcon, PlusIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Container, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { FilterBar } from '@/components/ui/filter-bar';
import { matches, oneOf } from '@/lib/list-filters';
import { getOwnedCourses } from '@/lib/api/staff';
import { getSessionUser } from '@/lib/session';
import { ROLES } from '@/lib/types';

export const metadata: Metadata = { title: 'Studio' };

/**
 * Studio home: the courses this user may edit.
 *
 * The list comes from `/courses/mine`, which the backend scopes by role. An instructor
 * receives only courses they own; an admin or content manager receives the whole library.
 * There is no "show all" switch here because there is no request this page could make to
 * widen it.
 */
const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const STATUS = ['published', 'draft'] as const;

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; status?: string }>;
}) {
  const params = await searchParams;
  const [user, all] = await Promise.all([getSessionUser(), getOwnedCourses()]);

  const term = (params.q ?? '').trim();
  const level = oneOf(params.level, LEVELS);
  const status = oneOf(params.status, STATUS);

  // Filtered here rather than in the query. `/courses/mine` is already scoped to what this
  // person may edit, so the list is small and one request answers every filter.
  const courses = all.filter((course) => {
    if (level && course.level !== level) return false;
    if (status === 'published' && !course.isPublished) return false;
    if (status === 'draft' && course.isPublished) return false;
    return matches(term, course.title, course.description, course.owner?.username);
  });

  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const canWriteBlog = user?.role === ROLES.ADMIN || user?.role === ROLES.CONTENT_MANAGER;

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            as="h1"
            title="Studio"
            lede={
              isInstructor
                ? 'The courses you own. Lessons and quizzes are edited from here.'
                : 'Every course on the platform, plus the blog.'
            }
          />

          <div className="flex flex-wrap gap-3">
            {canWriteBlog ? (
              <ButtonLink href="/studio/blog" variant="outline">
                Blog
              </ButtonLink>
            ) : null}
            <ButtonLink href="/studio/courses/new">
              <PlusIcon size={15} weight="bold" aria-hidden />
              New course
            </ButtonLink>
          </div>
        </div>

        <FilterBar
          searchLabel="Search courses by title, description or owner"
          searchPlaceholder="Search courses"
          noun="course"
          total={courses.length}
          selects={[
            {
              name: 'status',
              label: 'Filter by status',
              options: [
                { value: '', label: 'Any status' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ],
            },
            {
              name: 'level',
              label: 'Filter by level',
              options: [
                { value: '', label: 'All levels' },
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ],
            },
          ]}
        />

        {courses.length === 0 ? (
          <EmptyState
            icon={<BooksIcon size={32} aria-hidden />}
            title="No courses yet"
            description="Create one and it will appear here with its lessons, quiz and enrollment count."
            action={
              <ButtonLink href="/studio/courses/new" withArrow>
                New course
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col">
            {courses.map((course) => (
              <div
                key={course.documentId}
                className="flex flex-col border-b border-line first:border-t"
              >
                <Link
                  href={`/studio/courses/${course.documentId}`}
                  className="group flex flex-wrap items-center justify-between gap-4 py-5 transition-colors duration-200 hover:bg-surface"
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-medium text-text transition-colors group-hover:text-accent-text">
                        {course.title}
                      </span>
                      {course.isPublished ? null : <Badge tone="neutral">Draft</Badge>}
                    </div>
                    {course.owner ? (
                      <span className="microlabel">{course.owner.username}</span>
                    ) : null}
                  </div>

                  <dl className="flex items-center gap-6">
                    <Count value={course.lessonCount} label="lessons" />
                    <Count value={course.quizCount} label="quizzes" />
                    <Count value={course.enrollmentCount} label="enrolled" />
                  </dl>
                </Link>

                {/* Outside the row link, not inside it: an anchor nested in an anchor is
                  invalid markup and the browser resolves it by dropping one of them.
                  The studio row edits the course; this goes to the cohort. */}
                <Link
                  href={`/studio/courses/${course.documentId}/insights`}
                  className="w-fit pb-5 text-sm font-medium text-accent-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
                >
                  View student progress
                </Link>
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="font-mono text-sm tabular-nums text-text">{String(value).padStart(2, '0')}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}
