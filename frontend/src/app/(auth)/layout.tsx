import { Container } from '@/components/ui/primitives';

/**
 * Shell for the auth screens.
 *
 * Centred and narrow on purpose: this is the one place in the product where a single task
 * deserves the whole viewport, so there is nothing else on the page to look at.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70dvh] items-center py-16 lg:py-20">
      <Container>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </Container>
    </div>
  );
}
