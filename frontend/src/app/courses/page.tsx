import type { Metadata } from 'next';
import { BooksIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Container, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { FilterBar } from '@/components/ui/filter-bar';
import { CourseCard } from '@/components/marketing/course-card';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/cn';
import { matches, oneOf, SORT_KEYS, SORT_LABELS, type SortKey } from '@/lib/list-filters';
import { getPublishedCourses } from '@/lib/api/public';
import { LEVEL_LABELS, type CourseLevel } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Every published course, with lesson counts and the instructor who wrote it.',
};

const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
const CONTENT = ['quiz', 'no-quiz'] as const;

/** Cards per line on desktop. Also the chunk size, so the two must stay in step. */
const ROW_SIZE = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Catalog.
 *
 * Search and filters live in `searchParams` rather than in client state, so a filtered view
 * has its own URL that can be shared, bookmarked and hit directly, and the page stays a
 * Server Component.
 *
 * The filtering itself happens here, over the full list, rather than being pushed into the
 * Strapi query. The catalog is fetched whole and cached under one tag; a per-term query
 * would fragment that into a cache entry for every string anybody has ever typed, to save
 * filtering a few dozen rows.
 */
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; content?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const courses = await getPublishedCourses();

  const term = (params.q ?? '').trim();
  const level = oneOf(params.level, LEVELS);
  const content = oneOf(params.content, CONTENT);
  const sort = oneOf<SortKey>(params.sort, SORT_KEYS);

  const filtered = courses.filter((course) => {
    if (level && course.level !== level) return false;

    const hasQuiz = (course.quizCount ?? course.quizzes?.length ?? 0) > 0;
    if (content === 'quiz' && !hasQuiz) return false;
    if (content === 'no-quiz' && hasQuiz) return false;

    // The instructor's name is searchable too: "who else teaches here" is a question
    // people ask of a catalog, and it costs one more field to answer.
    return matches(term, course.title, course.description, course.instructor?.username);
  });

  // The API already returns the catalog newest-first, so "newest" is the unsorted order
  // and only the other two keys reorder. `Course` carries no timestamp — adding one to the
  // public projection just to sort a list the server already sorted would be backwards.
  const visible =
    sort === 'title'
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title))
      : sort === 'oldest'
        ? [...filtered].reverse()
        : filtered;

  const rows = chunk(visible, ROW_SIZE);

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          as="h1"
          title="Courses"
          lede="Everything published so far. Enroll and the lessons unlock in order."
        />

        <FilterBar
          searchLabel="Search courses by title, description or instructor"
          searchPlaceholder="Search courses"
          noun="course"
          total={visible.length}
          selects={[
            {
              name: 'level',
              label: 'Filter by level',
              options: [
                { value: '', label: 'All levels' },
                ...LEVELS.map((value) => ({ value, label: LEVEL_LABELS[value] })),
              ],
            },
            {
              name: 'content',
              label: 'Filter by content',
              options: [
                { value: '', label: 'Any content' },
                { value: 'quiz', label: 'With a quiz' },
                { value: 'no-quiz', label: 'Without a quiz' },
              ],
            },
            {
              name: 'sort',
              label: 'Sort courses',
              options: [
                { value: '', label: 'Newest first' },
                ...SORT_KEYS.filter((key) => key !== 'newest').map((key) => ({
                  value: key,
                  label: SORT_LABELS[key],
                })),
              ],
            },
          ]}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={<BooksIcon size={32} aria-hidden />}
            title="Nothing matches"
            description="No published course matches those filters. Try a broader search."
            action={
              <ButtonLink href="/courses" variant="outline">
                Clear filters
              </ButtonLink>
            }
          />
        ) : (
          /*
            Two layouts in one tree, the same arrangement the blog index uses.

            Below `lg` this is an ordinary grid and the row wrappers are `display: contents`,
            so every card flows into one grid and the chunking is invisible — a row of three
            does not become a ragged 2 + 1 on a tablet.

            From `lg` each row is its own flex line, which is what makes the expansion work:
            hovering a card raises its `flex-grow`, and the flex algorithm re-solves the
            line every frame so its neighbours give up width without a tween of their own.
          */
          <div className="grid gap-6 sm:grid-cols-2 lg:flex lg:flex-col">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="contents lg:flex lg:gap-6">
                {row.map((course, columnIndex) => {
                  const index = rowIndex * ROW_SIZE + columnIndex;

                  return (
                    <Reveal
                      key={course.documentId}
                      delay={Math.min(columnIndex, 5) * 0.05}
                      className={cn(
                        // `basis-0` so the cards start dead equal regardless of how much
                        // text each holds, and `min-w-0` so a long title cannot set a floor
                        // that stops a card ever being squeezed.
                        'lg:min-w-0 lg:flex-1 lg:basis-0',
                        // Only `flex-grow` transitions. Animating `flex` wholesale would
                        // drag `flex-basis` along with it and fight the layout.
                        'lg:motion-safe:transition-[flex-grow] lg:motion-safe:duration-500',
                        // The `ease-*` utility, not a raw `transition-timing-function`: the
                        // raw property ties with the one `transition-*` writes for itself
                        // and loses on rule order.
                        'lg:ease-[var(--ease-settle)]',
                        // Tailwind compiles `hover:` to `@media (hover: hover)`, so a touch
                        // screen never gets a card stuck open, and `motion-safe` keeps it
                        // out of reduced-motion rather than snapping it open untransitioned.
                        'lg:motion-safe:hover:flex-[2.4]'
                      )}
                    >
                      <CourseCard course={course} priority={index < ROW_SIZE} fixedMedia />
                    </Reveal>
                  );
                })}

                {/* A short last row must leave its cards at one third, not stretch them
                    across the line. The spacers only exist on the flex layout. */}
                {Array.from({ length: ROW_SIZE - row.length }).map((_, index) => (
                  <div
                    key={`spacer-${index}`}
                    aria-hidden
                    className="hidden lg:block lg:flex-1 lg:basis-0"
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
