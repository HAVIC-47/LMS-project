import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] items-center py-20">
      <Container>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
          <p className="font-mono text-sm tabular-nums text-text-subtle">404</p>
          <h1 className="display-tight text-3xl font-semibold sm:text-4xl">
            That page is not here.
          </h1>
          <p className="text-text-muted">
            The link may be out of date, or the thing it pointed at may have been unpublished.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/courses" withArrow>
              Browse courses
            </ButtonLink>
            <ButtonLink href="/" variant="outline">
              Home
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  );
}
