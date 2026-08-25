import { Container, Skeleton } from '@/components/ui/primitives';

export default function DashboardLoading() {
  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
              <Skeleton className="aspect-[16/9] w-full rounded-input" />
              <Skeleton className="h-6 w-20 rounded-control" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-1.5 w-full rounded-control" />
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
