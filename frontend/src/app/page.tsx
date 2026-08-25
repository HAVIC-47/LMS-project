import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { Reveal } from '@/components/ui/reveal';
import { Hero } from '@/components/marketing/hero';
import { FinishingSection } from '@/components/marketing/finishing-section';
import { CourseCard } from '@/components/marketing/course-card';
import { PostCard } from '@/components/marketing/post-card';
import { getPublishedCourses, getPublishedPosts, summariseCatalog } from '@/lib/api/public';

/**
 * Landing page.
 *
 * Eight sections. Neither of the first two carries a photograph — the hero is type over a
 * generated field and the argument draws its own claim — and the two card grids are kept
 * apart by a full-bleed band and a pull-quote so they never sit next to each other:
 *
 *   1. type-led hero over an interactive GSAP field
 *   2. figures on a single rule
 *   3. the finishing argument beside a GSAP infographic, unequal at 5/7
 *   4. course cards in a three-across grid
 *   5. full-bleed statement band
 *   6. offset pull-quote, indented rather than centred
 *   7. blog cards
 *   8. full-width type call to action
 */
export default async function HomePage() {
  const [courses, posts] = await Promise.all([getPublishedCourses(), getPublishedPosts()]);
  const stats = summariseCatalog(courses);
  const latestPosts = posts.slice(0, 4);

  return (
    <>
      <Hero />
      <Figures {...stats} />
      <FinishingSection />
      <Catalog courses={courses} />
      <StatementBand />
      <PullQuote />
      {latestPosts.length > 0 ? <FromTheBlog posts={latestPosts} /> : null}
      <Closing />
    </>
  );
}

/** Three figures on one rule. No boxes and no dividers between them. */
function Figures({
  courseCount,
  lessonCount,
  instructorCount,
}: {
  courseCount: number;
  lessonCount: number;
  instructorCount: number;
}) {
  const entries = [
    { value: courseCount, label: courseCount === 1 ? 'course' : 'courses' },
    { value: lessonCount, label: lessonCount === 1 ? 'lesson' : 'lessons' },
    { value: instructorCount, label: instructorCount === 1 ? 'instructor' : 'instructors' },
  ];

  return (
    <section className="border-b border-line">
      <Container>
        <dl className="flex flex-wrap items-baseline gap-x-16 gap-y-6 py-8">
          {entries.map((entry) => (
            <div key={entry.label} className="flex items-baseline gap-3">
              <dd className="font-mono text-2xl tabular-nums text-text">
                {String(entry.value).padStart(2, '0')}
              </dd>
              <dt className="microlabel">{entry.label}</dt>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

function Catalog({ courses }: { courses: Awaited<ReturnType<typeof getPublishedCourses>> }) {
  if (courses.length === 0) return null;

  const featured = courses.slice(0, 3);

  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="display-tight font-serif text-[2rem] font-normal sm:text-[2.5rem]">
            The catalog
          </h2>
          <Link
            href="/courses"
            className="group flex items-center gap-2 text-sm font-medium text-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
          >
            All courses
            <ArrowRightIcon
              size={14}
              aria-hidden
              className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div
          className={cn(
            'grid gap-6',
            featured.length === 1
              ? 'sm:grid-cols-1'
              : featured.length === 2
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {featured.map((course, index) => (
            <Reveal key={course.documentId} delay={index * 0.06}>
              <CourseCard course={course} priority={index === 0} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Full-bleed band. One sentence, nothing else. */
function StatementBand() {
  return (
    <section className="relative isolate flex min-h-[60vh] items-end overflow-hidden border-b border-line">
      <Image
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1800&q=80"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/60 to-transparent"
      />

      <Container className="relative pb-16">
        <Reveal>
          <p className="max-w-[22ch] font-serif text-[clamp(1.75rem,4vw,3rem)] leading-tight text-zinc-50">
            Progress that is actually yours.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

/** Offset pull-quote, indented into the measure rather than centred. */
function PullQuote() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <Reveal>
          <figure className="grid gap-6 lg:grid-cols-12">
            <blockquote className="lg:col-span-8 lg:col-start-3">
              <p className="font-serif text-[clamp(1.5rem,3vw,2.25rem)] leading-snug text-text">
                &ldquo;I stopped guessing where I&rsquo;d got to. The percentage matches the
                lessons I actually finished, which sounds obvious until you use a platform
                where it doesn&rsquo;t.&rdquo;
              </p>
            </blockquote>
            <figcaption className="text-sm text-text-muted lg:col-span-8 lg:col-start-3">
              Priya Raghunathan, backend engineer at Havenlink
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}

function FromTheBlog({ posts }: { posts: Awaited<ReturnType<typeof getPublishedPosts>> }) {
  const shown = posts.slice(0, 3);

  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container className="flex flex-col gap-10">
        <h2 className="display-tight font-serif text-[2rem] font-normal sm:text-[2.5rem]">
          From the blog
        </h2>

        {/* Column count follows the number of posts. A three-track grid holding two cards
            leaves a visible hole, which reads as a missing item rather than a choice. */}
        <div
          className={cn(
            'grid gap-6',
            shown.length === 1
              ? 'sm:grid-cols-1'
              : shown.length === 2
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {shown.map((post, index) => (
            <Reveal key={post.documentId} delay={index * 0.06}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Closing() {
  return (
    <section className="py-24 lg:py-32">
      <Container className="flex flex-col gap-10">
        <h2 className="display-tight max-w-[12ch] font-serif text-[clamp(2.25rem,6.5vw,4.5rem)] font-normal">
          Pick a course and finish it.
        </h2>

        <div className="flex flex-wrap items-center gap-5">
          <ButtonLink href="/signup" size="lg" withArrow>
            Get started
          </ButtonLink>
          <span className="text-sm text-text-muted">Free to join.</span>
        </div>
      </Container>
    </section>
  );
}
