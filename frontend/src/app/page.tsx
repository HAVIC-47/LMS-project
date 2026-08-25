import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, CheckIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Container, Panel, ProgressRail, SectionHeading, Stat } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/reveal';
import { CourseCard } from '@/components/marketing/course-card';
import { getPublishedCourses, getPublishedPosts, summariseCatalog } from '@/lib/api/public';

/**
 * Landing page.
 *
 * One layout family per section, so no two read the same way:
 *   1. hero, asymmetric 7/5 with a live product panel
 *   2. measured rule: stats sitting in a hairline grid
 *   3. numbered steps in a three-column rule grid
 *   4. course grid
 *   5. full-bleed image band with an overlaid claim
 *   6. quote
 *   7. writing list
 *   8. closing panel
 */
export default async function HomePage() {
  const [courses, posts] = await Promise.all([getPublishedCourses(), getPublishedPosts()]);
  const stats = summariseCatalog(courses);
  const featured = courses.slice(0, 3);
  const latestPosts = posts.slice(0, 2);

  return (
    <>
      <Hero />
      <Measures {...stats} />
      <HowItWorks />
      <FeaturedCourses courses={featured} hasMore={courses.length > featured.length} />
      <ImageBand />
      <Quote />
      {latestPosts.length > 0 ? <Writing posts={latestPosts} /> : null}
      <Closing />
    </>
  );
}

/**
 * Four text elements, which is the cap: headline, subtext, two buttons. No trust strip,
 * no tagline under the buttons, no scroll cue.
 *
 * The right-hand panel renders the same `ProgressRail` the app actually uses, on real
 * copy from the seeded course. It is a product surface, not a drawing of one.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line pb-20 pt-14 sm:pt-20 lg:pb-28">
      {/* One soft wash, low opacity, non-interactive. No glow, no mesh gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[540px] opacity-[0.55] [background:radial-gradient(52%_44%_at_18%_0%,var(--accent-soft),transparent_72%)]"
      />

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-7 lg:col-span-7">
            <h1 className="display-tight text-[2.75rem] font-semibold sm:text-6xl lg:text-7xl">
              Learn the parts
              <br />
              that stick.
            </h1>

            <p className="max-w-[44ch] text-lg leading-relaxed text-text-muted">
              Short courses with real lessons. Progress counts what you finished, and every quiz
              marks itself the moment you submit.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/signup" size="lg" withArrow>
                Get started
              </ButtonLink>
              <ButtonLink href="/courses" variant="outline" size="lg">
                Browse courses
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Reveal>
              <HeroPanel />
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

function HeroPanel() {
  const lessons = [
    { title: 'Values, bindings and scope', done: true },
    { title: 'Closures in practice', done: true },
    { title: 'The event loop, visually', done: false },
    { title: 'Promises and async/await', done: false },
    { title: 'Modules and bundling', done: false },
  ];

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <p className="truncate text-sm font-medium text-text">Modern JavaScript Foundations</p>
        <span className="microlabel shrink-0">2 / 5</span>
      </div>

      <div className="px-5 py-4">
        <ProgressRail value={40} size="sm" />
      </div>

      <ul className="flex flex-col px-2 pb-3">
        {lessons.map((lesson) => (
          <li key={lesson.title} className="flex items-center gap-3 rounded-input px-3 py-2.5 text-sm">
            <span
              aria-hidden
              className={
                lesson.done
                  ? 'flex size-4 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-ink-on'
                  : 'size-4 shrink-0 rounded-pill border border-line-strong'
              }
            >
              {lesson.done ? <CheckIcon size={10} weight="bold" /> : null}
            </span>
            <span className={lesson.done ? 'text-text-subtle' : 'text-text'}>{lesson.title}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Figures in a hairline grid. Three numbers do not need three boxes. */
function Measures({
  courseCount,
  lessonCount,
  instructorCount,
}: {
  courseCount: number;
  lessonCount: number;
  instructorCount: number;
}) {
  const entries = [
    { value: String(courseCount).padStart(2, '0'), label: courseCount === 1 ? 'course' : 'courses' },
    { value: String(lessonCount).padStart(2, '0'), label: lessonCount === 1 ? 'lesson' : 'lessons' },
    {
      value: String(instructorCount).padStart(2, '0'),
      label: instructorCount === 1 ? 'instructor' : 'instructors',
    },
  ];

  return (
    <section className="border-b border-line">
      <Container>
        <dl className="grid grid-cols-3 divide-x divide-line">
          {entries.map((entry) => (
            <div key={entry.label} className="py-10 pl-5 first:pl-0 sm:pl-10">
              <dt className="sr-only">{entry.label}</dt>
              <dd>
                <Stat value={entry.value} label={entry.label} />
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

/**
 * Three steps in a rule grid, numbered in mono.
 *
 * The numbers are the label, so there is no uppercase eyebrow above each one and no
 * "Stage 1 / Stage 2" prefix in the headings.
 */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Enroll',
      body: 'Pick a course from the catalog. Lessons unlock in the order the instructor set them.',
    },
    {
      n: '02',
      title: 'Work through it',
      body: 'Read or watch, then mark the lesson done. The percentage is recomputed on the server from the lessons you actually finished.',
    },
    {
      n: '03',
      title: 'Sit the quiz',
      body: 'Answers are graded the moment you submit. Your score is stored and you can read it back at any time.',
    },
  ];

  return (
    <section className="border-b border-line py-24 lg:py-28">
      <Container className="flex flex-col gap-14">
        <Reveal>
          <SectionHeading
            title="Built around finishing, not starting."
            lede="Most platforms measure signups. This one measures the lesson you just closed."
          />
        </Reveal>

        <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.n} delay={index * 0.07}>
              <div className="flex h-full flex-col gap-4 bg-page p-7">
                <span className="font-mono text-sm tabular-nums text-accent-text">{step.n}</span>
                <h3 className="text-xl font-semibold text-text">{step.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FeaturedCourses({
  courses,
  hasMore,
}: {
  courses: Awaited<ReturnType<typeof getPublishedCourses>>;
  hasMore: boolean;
}) {
  if (courses.length === 0) return null;

  return (
    <section className="border-b border-line py-24 lg:py-28">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading title="Start with one of these." />
          {hasMore ? (
            <Link
              href="/courses"
              className="group flex items-center gap-2 text-sm font-medium text-accent-text"
            >
              All courses
              <ArrowRightIcon
                size={15}
                aria-hidden
                className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0.5"
              />
            </Link>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <Reveal key={course.documentId} delay={index * 0.07}>
              <CourseCard course={course} priority={index === 0} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/**
 * Full-bleed band. Breaks the container rhythm once, so the page has a moment that is not
 * a grid of panels.
 */
function ImageBand() {
  return (
    <section className="relative isolate flex min-h-[460px] items-end overflow-hidden border-b border-line">
      <Image
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1800&q=80"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-[#09090b]/10"
      />

      <Container className="relative pb-14">
        <Reveal>
          <div className="flex max-w-[46ch] flex-col gap-4">
            <h2 className="display-tight text-3xl font-semibold text-zinc-50 sm:text-4xl">
              Progress that is actually yours.
            </h2>
            <p className="leading-relaxed text-zinc-300">
              Mark a lesson complete and the number is recalculated from your own records. Close
              the tab, come back next week, it still reads the same.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function Quote() {
  return (
    <section className="border-b border-line py-24 lg:py-28">
      <Container>
        <Reveal>
          <figure className="mx-auto flex max-w-3xl flex-col gap-7 text-center">
            <blockquote className="text-2xl font-medium leading-snug text-text sm:text-[1.75rem]">
              &ldquo;I stopped guessing where I&rsquo;d got to. The percentage matches the lessons I
              actually finished, which sounds obvious until you use a platform where it
              doesn&rsquo;t.&rdquo;
            </blockquote>
            {/* A person's name is not a data label: the mono uppercase treatment used
                elsewhere would render it as PRIYA RAGHUNATHAN. */}
            <figcaption className="text-sm text-text-muted">
              Priya Raghunathan, backend engineer at Havenlink
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}

function Writing({ posts }: { posts: Awaited<ReturnType<typeof getPublishedPosts>> }) {
  return (
    <section className="border-b border-line py-24 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading title="Writing" />
        </div>

        <div className="flex flex-col lg:col-span-8">
          {posts.map((post, index) => (
            <Reveal key={post.documentId} delay={index * 0.07}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-2 border-b border-line py-7 first:border-t"
              >
                <h3 className="text-xl font-semibold text-text transition-colors duration-200 group-hover:text-accent-text">
                  {post.title}
                </h3>
                {post.excerpt ? (
                  <p className="max-w-[62ch] text-sm leading-relaxed text-text-muted">
                    {post.excerpt}
                  </p>
                ) : null}
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Closing() {
  return (
    <section className="py-24 lg:py-28">
      <Container>
        <Reveal>
          <Panel className="flex flex-col items-center gap-7 px-6 py-20 text-center">
            <h2 className="display-tight max-w-[15ch] text-3xl font-semibold sm:text-5xl">
              Pick a course and finish it.
            </h2>
            <p className="max-w-[46ch] text-lg text-text-muted">
              Free to join. Enroll, work through the lessons in order, and sit the quiz when you
              are ready.
            </p>
            <ButtonLink href="/signup" size="lg" withArrow>
              Get started
            </ButtonLink>
          </Panel>
        </Reveal>
      </Container>
    </section>
  );
}
