import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';

export default function BlogLoading() {
  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-14">
        <SectionHeading as="h1" title="Writing" />

        <div className="grid gap-8 rounded-card border border-line bg-surface p-6 sm:p-8 lg:grid-cols-2">
          <Skeleton className="aspect-[16/10] w-full rounded-card" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        <div className="flex flex-col gap-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="grid gap-3 border-b border-line pb-7 sm:grid-cols-12 sm:gap-6">
              <Skeleton className="h-4 w-24 sm:col-span-3" />
              <div className="flex flex-col gap-3 sm:col-span-9">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
