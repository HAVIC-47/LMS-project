'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';

/**
 * Route error boundary.
 *
 * The message shown is fixed. `error.message` from a server render is scrubbed in
 * production anyway, and printing whatever survived would leak internals to a visitor
 * while telling them nothing they can act on. `reset` re-runs the segment, which is worth
 * offering because the usual cause here is the backend being briefly unreachable.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center py-20">
      <Container>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
          <h1 className="display-tight text-3xl font-semibold sm:text-4xl">
            Something broke on our side.
          </h1>
          <p className="text-text-muted">
            This page could not load. Trying again often works, since the usual cause is a
            request that timed out.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-text-subtle">Reference {error.digest}</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/" variant="outline">
              Home
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  );
}
