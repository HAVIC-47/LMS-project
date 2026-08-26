import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge, Container, EmptyState } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { StudentDashboard } from '@/components/dashboard/student-dashboard';
import { InstructorDashboard } from '@/components/dashboard/instructor-dashboard';
import { WriterDashboard } from '@/components/dashboard/writer-dashboard';
import { requireUser } from '@/lib/guards';
import { ROLE_LABELS, ROLES } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/**
 * Role-aware home.
 *
 * One route, three views plus a redirect. Splitting these into separate URLs would mean
 * separate guards to keep in step; here the role decides which panel renders and every
 * panel's data comes from an endpoint the backend has already scoped to the caller.
 *
 * `requireUser` redirects anonymous visitors, but it is not what protects the data: each
 * fetch below carries the caller's token and Strapi answers according to their role. A
 * student who somehow reached the instructor branch would simply get nothing back.
 *
 * The three views answer three different questions, which is why they no longer share a
 * component:
 *
 *   student — how am I doing (My Courses is where you go to carry on)
 *   instructor — which of my courses needs attention
 *   content manager — is my writing landing
 */
export default async function DashboardPage() {
  const user = await requireUser();

  // An admin's dashboard *is* the admin panel. Rendering a second, thinner version of it
  // here would leave two pages to keep in step, and the header sends admins to /admin for
  // the same reason — see `roleLinks` in the site header.
  if (user.role === ROLES.ADMIN) {
    redirect('/admin');
  }

  const name = user.displayName || user.username;

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar src={user.avatarUrl} name={name} size="lg" />
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
                  {name}
                </h1>
                {user.role ? <Badge tone="accent">{ROLE_LABELS[user.role]}</Badge> : null}
              </div>
              <p className="text-sm text-text-muted">{user.email}</p>
            </div>
          </div>

          <ButtonLink href={`/u/${user.username}`} variant="outline" size="sm">
            View profile
          </ButtonLink>
        </header>

        {user.role === ROLES.STUDENT ? <StudentDashboard /> : null}
        {user.role === ROLES.INSTRUCTOR ? <InstructorDashboard /> : null}
        {user.role === ROLES.CONTENT_MANAGER ? <WriterDashboard /> : null}

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
