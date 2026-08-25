import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BooksIcon, GraduationCapIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Container, EmptyState, LevelBadge, ProgressRail } from '@/components/ui/primitives';
import { requireUser } from '@/lib/guards';
import { getMyEnrollments } from '@/lib/api/student';
import { getOwnedCourses, getPlatformStats } from '@/lib/api/staff';
import { ROLE_LABELS, ROLES } from '@/lib/types';
import { isRenderableImage } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/**
 * Role-aware home.
 *
 * One route, four views. Splitting these into four URLs would mean four guards to keep in
 * step; here the role decides which panel renders and every panel's data comes from an
 * endpoint the backend has already scoped to the caller.
 *
 * `requireUser` redirects anonymous visitors, but note that it is not what protects the
 * data: each fetch below carries the caller's token and Strapi answers according to their
 * role. A student who reached the admin branch would simply get nothing back.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {user.username}
            </h1>
            {user.role ? <Badge tone="accent">{ROLE_LABELS[user.role]}</Badge> : null}
          </div>
          <p className="text-text-muted">{user.email}</p>
        </header>

        {user.role === ROLES.STUDENT ? <StudentView /> : null}
        {user.role === ROLES.INSTRUCTOR || user.role === ROLES.CONTENT_MANAGER ? (
          <StaffView />
        ) : null}
        {user.role === ROLES.ADMIN ? <AdminView /> : null}
        {!user.role ? (
          <EmptyState
            title="No role assigned"
            description="Your account has no role yet, so there is nothing to show. An admin can assign one."
          />
        ) : null}
      </Container>
    </div>
  );
}

async function StudentView() {
  const enrollments = await getMyEnrollments();

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCapIcon size={32} aria-hidden />}
        title="You are not enrolled in anything yet"
        description="Browse the catalog and enroll in a course. Your progress will show up here."
        action={
          <ButtonLink href="/courses" withArrow>
            Browse courses
          </ButtonLink>
        }
      />
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Your courses</h2>
        <Link href="/my-courses" className="text-sm font-medium text-accent-text">
          All of them
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments.map((enrollment) => (
          <Link
            key={enrollment.documentId}
            href={`/learn/${enrollment.course.slug}`}
            className="group flex cursor-pointer flex-col gap-4 rounded-card border border-line bg-surface p-5 transition-[border-color,transform] duration-500 [transition-timing-function:var(--ease-settle)] hover:-translate-y-0.5 hover:border-line-strong"
          >
            {isRenderableImage(enrollment.course.coverImageUrl) ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-input bg-shell">
                <Image
                  src={enrollment.course.coverImageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <LevelBadge level={enrollment.course.level} />
              <h3 className="font-semibold text-text transition-colors group-hover:text-accent-text">
                {enrollment.course.title}
              </h3>
            </div>

            <ProgressRail
              className="mt-auto"
              value={enrollment.progress.percentage}
              label={`${enrollment.progress.completed} of ${enrollment.progress.total} lessons`}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

async function StaffView() {
  const courses = await getOwnedCourses();

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<BooksIcon size={32} aria-hidden />}
        title="No courses yet"
        description="Courses you create will be listed here with their lesson counts and enrollments."
      />
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Courses you manage</h2>
        <Link href="/studio" className="text-sm font-medium text-accent-text">
          Open the studio
        </Link>
      </div>

      <div className="flex flex-col">
        {courses.map((course) => (
          <div
            key={course.documentId}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-5 first:border-t"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/courses/${course.slug}`}
                  className="font-medium text-text transition-colors hover:text-accent-text"
                >
                  {course.title}
                </Link>
                {course.isPublished ? null : <Badge tone="neutral">Draft</Badge>}
              </div>
              {course.owner ? (
                <p className="text-sm text-text-subtle">Owned by {course.owner.username}</p>
              ) : null}
            </div>

            <dl className="flex items-center gap-6 text-sm text-text-muted">
              <div className="flex items-baseline gap-1.5">
                <dd className="font-mono tabular-nums text-text">{course.lessonCount}</dd>
                <dt>lessons</dt>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dd className="font-mono tabular-nums text-text">{course.quizCount}</dd>
                <dt>quizzes</dt>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dd className="font-mono tabular-nums text-text">{course.enrollmentCount}</dd>
                <dt>enrolled</dt>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

async function AdminView() {
  const [stats, courses] = await Promise.all([getPlatformStats(), getOwnedCourses()]);

  return (
    <div className="flex flex-col gap-12">
      {stats ? (
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">Platform</h2>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Users" value={stats.users.total} />
            <Stat label="Courses" value={stats.courses.total} />
            <Stat label="Lessons" value={stats.lessons.total} />
            <Stat label="Enrollments" value={stats.enrollments.total} />
            <Stat label="Quiz attempts" value={stats.quizzes.attempts} />
            <Stat label="Posts" value={stats.blogPosts.published} />
          </dl>

          <div className="flex flex-wrap gap-2">
            {stats.users.byRole.map((entry) => (
              <Badge key={entry.role} tone="neutral">
                {entry.name}
                <span className="font-mono tabular-nums text-text">{entry.count}</span>
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {courses.length > 0 ? <StaffView /> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 bg-surface p-5">
      <dd className="font-mono text-2xl tabular-nums text-text">{value}</dd>
      <dt className="text-sm text-text-muted">{label}</dt>
    </div>
  );
}
