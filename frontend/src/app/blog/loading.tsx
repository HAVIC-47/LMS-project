import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';

export default function BlogLoading() {
  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-14">
        <SectionHeading as="h1" title="Blog" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={
                'overflow-hidden rounded-card border border-line bg-surface-raised' +
                (index === 0 ? ' sm:col-span-2' : '')
              }
            >
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="flex flex-col gap-3 p-5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
