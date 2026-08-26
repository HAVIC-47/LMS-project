import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { Container, SectionHeading, Stat } from '@/components/ui/primitives';
import { UserTable } from '@/components/studio/user-table';
import { getPlatformStats } from '@/lib/api/staff';
import { UserFilters } from '@/components/studio/user-filters';
import { getPlatformUsers } from '@/lib/api/insights';
import { requireRole } from '@/lib/guards';
import { ROLE_LABELS, ROLES, type RoleType } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin' };

/**
 * Admin panel.
 *
 * Both requests here are admin-only on the backend. If the role guard above were removed,
 * this page would render its shell and then show nothing at all, because Strapi would
 * refuse both calls. The guard controls what is worth rendering, not what is reachable.
 */
type Props = {
  searchParams: Promise<{ search?: string; role?: string; status?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const user = await requireRole([ROLES.ADMIN]);

  // Filters come from the URL and are applied by the backend query, so a filtered view is
  // linkable and the browser never receives the users it is not showing.
  const filters = await searchParams;

  const [stats, users] = await Promise.all([
    getPlatformStats(),
    getPlatformUsers({ search: filters.search, role: filters.role, status: filters.status }),
  ]);

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            as="h1"
            title="Admin"
            lede="Everything on the platform, and the only place roles are assigned."
          />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/studio" variant="outline">
              Studio
            </ButtonLink>
            <ButtonLink href="/studio/blog" variant="outline">
              Blog
            </ButtonLink>
          </div>
        </div>

        {stats ? (
          <section className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold">Platform</h2>

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
              <Cell value={stats.users.total} label="users" />
              <Cell value={stats.courses.total} label="courses" />
              <Cell value={stats.lessons.total} label="lessons" />
              <Cell value={stats.enrollments.total} label="enrollments" />
              <Cell value={stats.quizzes.attempts} label="attempts" />
              <Cell value={stats.blogPosts.published} label="posts live" />
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <Breakdown
                title="Courses"
                rows={[
                  { label: 'published', value: stats.courses.published },
                  { label: 'drafts', value: stats.courses.drafts },
                ]}
              />
              <Breakdown
                title="Blog posts"
                rows={[
                  { label: 'published', value: stats.blogPosts.published },
                  { label: 'drafts', value: stats.blogPosts.drafts },
                ]}
              />
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">Users</h2>
            {stats ? (
              <div className="flex flex-wrap gap-4">
                {stats.users.byRole.map((entry) => (
                  <span key={entry.role} className="microlabel">
                    {ROLE_LABELS[entry.role as RoleType] ?? entry.name}{' '}
                    <span className="font-mono text-text">{entry.count}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <UserFilters total={users.length} />

          {users.length === 0 ? (
            <p className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-text-muted">
              No user matches these filters.
            </p>
          ) : (
            <UserTable users={users} currentUserId={user.id} />
          )}
        </section>
      </Container>
    </div>
  );
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-page p-5">
      <Stat value={String(value).padStart(2, '0')} label={label} />
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-card border border-line p-5">
      <h3 className="mb-3 text-sm font-medium text-text">{title}</h3>
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="microlabel">{row.label}</dt>
            <dd className="font-mono text-sm tabular-nums text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
