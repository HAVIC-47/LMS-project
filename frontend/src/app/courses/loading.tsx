import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';

/**
 * Catalog loading state.
 *
 * Skeletons in the shape of the cards that are coming, not a spinner: the layout is
 * already reserved, so nothing shifts when the data lands.
 */
export default function CoursesLoading() {
  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading title="Courses" />

        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-24 rounded-pill" />
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="enclosure">
              <div className="enclosure-core flex flex-col gap-4 p-1">
                <Skeleton className="aspect-[16/10] w-full rounded-card" />
                <div className="flex flex-col gap-3 p-4 pt-0">
                  <Skeleton className="h-6 w-20 rounded-pill" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
