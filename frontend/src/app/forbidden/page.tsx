import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';
import { getSessionUser } from '@/lib/session';
import { ROLE_LABELS } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Not allowed',
};

/**
 * Where a role guard sends someone who is signed in but not permitted.
 *
 * Deliberately not a redirect to the login page: they are already signed in, and bouncing
 * them to a form they do not need would read as a bug. Naming their current role tells
 * them what to ask an admin for.
 */
export default async function ForbiddenPage() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-[60dvh] items-center py-20">
      <Container>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
          <p className="font-mono text-sm tabular-nums text-text-subtle">403</p>
          <h1 className="display-tight text-3xl font-semibold sm:text-4xl">
            Your role cannot open that.
          </h1>
          <p className="text-text-muted">
            {user?.role
              ? `You are signed in as a ${ROLE_LABELS[user.role].toLowerCase()}. Ask an admin if you need wider access.`
              : 'Your account does not have a role that allows this page.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dashboard" withArrow>
              Your dashboard
            </ButtonLink>
            <ButtonLink href="/courses" variant="outline">
              Browse courses
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  );
}
