import Link from 'next/link';
import { Container } from '@/components/ui/primitives';

/**
 * Footer.
 *
 * Deliberately plain: two link groups and a line of attribution. No build number, no
 * locale strip, no weather, no "made with love in" line. None of that is information the
 * reader came for.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="flex flex-col gap-12 py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex max-w-sm flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold text-text">
              <span aria-hidden className="size-2.5 rounded-control bg-accent" />
              Kiln
            </Link>
            <p className="text-sm leading-relaxed text-text-muted">
              Short courses with real lessons, progress that reflects what you actually finished,
              and quizzes that mark themselves.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <nav aria-label="Learn" className="flex flex-col gap-3">
              <h2 className="microlabel">Learn</h2>
              <Link href="/courses" className="text-sm text-text-muted transition-colors hover:text-text">
                All courses
              </Link>
              <Link href="/blog" className="text-sm text-text-muted transition-colors hover:text-text">
                Blog
              </Link>
            </nav>

            <nav aria-label="Account" className="flex flex-col gap-3">
              <h2 className="microlabel">Account</h2>
              <Link href="/login" className="text-sm text-text-muted transition-colors hover:text-text">
                Log in
              </Link>
              <Link href="/signup" className="text-sm text-text-muted transition-colors hover:text-text">
                Create an account
              </Link>
            </nav>
          </div>
        </div>

        <p className="border-t border-line pt-8 text-sm text-text-subtle">
          {year} Kiln. Built as a project submission.
        </p>
      </Container>
    </footer>
  );
}
