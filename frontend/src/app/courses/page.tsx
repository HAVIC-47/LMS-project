import type { Metadata } from 'next';
import Link from 'next/link';
import { BooksIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/reveal';
import { CourseCard } from '@/components/marketing/course-card';
import { getPublishedCourses } from '@/lib/api/public';
import { LEVEL_LABELS, type CourseLevel } from '@/lib/types';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Every published course, with lesson counts and the instructor who wrote it.',
};

const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];

/**
 * Catalog.
 *
 * Filtering is done with links and `searchParams` rather than client state, so a filtered
 * view has its own URL that can be shared, bookmarked and hit directly. It also keeps the
 * page a Server Component, with no JavaScript needed to change the filter.
 *
 * `searchParams` is a Promise in Next 15 and later.
 */
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const courses = await getPublishedCourses();

  const activeLevel = LEVELS.includes(level as CourseLevel) ? (level as CourseLevel) : null;
  const visible = activeLevel ? courses.filter((course) => course.level === activeLevel) : courses;

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          as="h1"
          title="Courses"
          lede="Everything published so far. Enroll and the lessons unlock in order."
        />

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by level">
          <FilterPill href="/courses" active={activeLevel === null}>
            All
          </FilterPill>
          {LEVELS.map((value) => (
            <FilterPill
              key={value}
              href={`/courses?level=${value}`}
              active={activeLevel === value}
            >
              {LEVEL_LABELS[value]}
            </FilterPill>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<BooksIcon size={32} aria-hidden />}
            title={activeLevel ? `No ${LEVEL_LABELS[activeLevel].toLowerCase()} courses yet` : 'No courses published yet'}
            description={
              activeLevel
                ? 'Nothing at this level right now. Try another level, or look at everything.'
                : 'Once an instructor publishes a course it shows up here.'
            }
            action={
              activeLevel ? (
                <Link href="/courses" className="text-sm font-medium text-accent-text">
                  Show all courses
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((course, index) => (
              <Reveal key={course.documentId} delay={Math.min(index, 5) * 0.06}>
                <CourseCard course={course} priority={index < 3} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        // 44px tall so it stays a comfortable touch target on mobile.
        'flex h-11 cursor-pointer items-center rounded-pill border px-4 text-sm transition-colors duration-200',
        active
          ? 'border-accent bg-accent text-accent-ink-on'
          : 'border-line-strong bg-surface-raised text-text-muted hover:border-accent hover:text-accent-text'
      )}
    >
      {children}
    </Link>
  );
}
