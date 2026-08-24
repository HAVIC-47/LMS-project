import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ListChecksIcon,
  SealCheckIcon,
} from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Container, Enclosure, ProgressRail, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/reveal';
import { CourseCard } from '@/components/marketing/course-card';
import { getPublishedCourses, getPublishedPosts, summariseCatalog } from '@/lib/api/public';

/**
 * Landing page.
 *
 * Layout families used, one each, so no two sections share a shape:
 *   1. asymmetric split hero (7/5 grid)
 *   2. horizontal stat row on a hairline
 *   3. asymmetric bento, exactly 3 cells for 3 features
 *   4. course grid
 *   5. full-width quote
 *   6. two-column writing list
 *   7. centred closing call to action
 */
export default async function HomePage() {
  const [courses, posts] = await Promise.all([getPublishedCourses(), getPublishedPosts()]);
  const stats = summariseCatalog(courses);
  const featured = courses.slice(0, 3);
  const latestPosts = posts.slice(0, 2);

  return (
    <>
      <Hero />
      <Stats {...stats} />
      <HowItWorks />
      <FeaturedCourses courses={featured} hasMore={courses.length > featured.length} />
      <Testimonial />
      {latestPosts.length > 0 ? <LatestWriting posts={latestPosts} /> : null}
      <ClosingCta />
    </>
  );
}

/**
 * Asymmetric split hero: copy on the left, a real product surface on the right.
 *
 * The right panel is a live render of the progress rail component this app actually uses,
 * not a drawing of one. Four text elements total, which is the cap: headline, subtext,
 * two buttons. No trust strip, no tagline under the CTAs, no scroll cue.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pt-20 lg:pb-28 lg:pt-24">
      {/* A single soft wash behind the hero. Fixed and non-interactive so it never
          intercepts a click or forces a repaint while scrolling. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] opacity-60 [background:radial-gradient(60%_50%_at_15%_0%,var(--accent-soft),transparent_70%)]"
      />

      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-7 lg:col-span-7">
            <h1 className="display-tight text-4xl font-semibold sm:text-5xl lg:text-6xl">
              Learn the parts that stick.
            </h1>

            <p className="max-w-[46ch] text-lg leading-relaxed text-text-muted">
              Short courses with real lessons. Your progress reflects what you actually finished,
              and every quiz marks itself the moment you submit.
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
    <Enclosure>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-subtle">Modern JavaScript Foundations</p>
          <ProgressRail value={40} label="Your progress" />
        </div>

        <ul className="flex flex-col gap-1">
          {lessons.map((lesson) => (
            <li
              key={lesson.title}
              className="flex items-center gap-3 rounded-input px-2 py-2.5 text-sm"
            >
              {lesson.done ? (
                <CheckCircleIcon size={18} weight="fill" className="shrink-0 text-success" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className="size-[18px] shrink-0 rounded-pill border border-line-strong"
                />
              )}
              <span className={lesson.done ? 'text-text-subtle line-through' : 'text-text'}>
                {lesson.title}
              </span>
            </li>
          ))}
        </ul>

        <p className="border-t border-line pt-4 text-sm text-text-muted">
          <span className="font-mono tabular-nums text-text">2</span> of{' '}
          <span className="font-mono tabular-nums text-text">5</span> lessons done
        </p>
      </div>
    </Enclosure>
  );
}

/** Numbers on a hairline. No cards: three figures do not need three boxes. */
function Stats({
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
    <section className="border-y border-line bg-surface">
      <Container>
        <dl className="grid grid-cols-3 divide-x divide-line">
          {entries.map((entry) => (
            <div key={entry.label} className="flex flex-col gap-1 py-8 pl-4 first:pl-0 sm:pl-8">
              <dt className="sr-only">{entry.label}</dt>
              <dd className="font-mono text-3xl tabular-nums text-text sm:text-4xl">{entry.value}</dd>
              <p className="text-sm text-text-muted">{entry.label}</p>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

/**
 * Asymmetric bento: three features, exactly three cells, no filler tile. The wide cell
 * carries an image so the grid is not three text boxes in a row.
 */
function HowItWorks() {
  return (
    <section className="py-24 lg:py-32">
      <Container className="flex flex-col gap-12">
        <Reveal>
          <SectionHeading
            title="Built around finishing, not starting."
            lede="Most courses measure signups. These measure the lesson you just closed and the quiz you just sat."
          />
        </Reveal>

        <div className="grid gap-4 md:grid-cols-6 md:grid-rows-2">
          <Reveal className="md:col-span-4 md:row-span-2">
            <article className="relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden rounded-card border border-line p-8">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&q=80"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent"
              />
              <div className="relative flex flex-col gap-2 text-zinc-50">
                <h3 className="text-2xl font-semibold">Progress that is actually yours</h3>
                <p className="max-w-[42ch] text-sm leading-relaxed text-zinc-200">
                  Mark a lesson complete and the percentage is recomputed on the server from the
                  lessons you finished. Close the tab, come back next week, it is still right.
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.08} className="md:col-span-2">
            <article className="flex h-full flex-col gap-3 rounded-card border border-line bg-accent-soft p-6">
              <ListChecksIcon size={22} className="text-accent" aria-hidden />
              <h3 className="text-lg font-semibold text-text">Quizzes mark themselves</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                Answers are graded on the server the moment you submit. Your score is stored and
                you can read it back later.
              </p>
            </article>
          </Reveal>

          <Reveal delay={0.16} className="md:col-span-2">
            <article className="flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-6">
              <SealCheckIcon size={22} className="text-text-muted" aria-hidden />
              <h3 className="text-lg font-semibold text-text">Sequenced lessons</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                Lessons run in the order the instructor set, mixing written material and video
                without changing how you move through them.
              </p>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function FeaturedCourses({ courses, hasMore }: { courses: Awaited<ReturnType<typeof getPublishedCourses>>; hasMore: boolean }) {
  if (courses.length === 0) return null;

  return (
    <section className="border-t border-line bg-surface py-24 lg:py-32">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading title="Start with one of these." />
          {hasMore ? (
            <Link
              href="/courses"
              className="group flex items-center gap-2 text-sm font-medium text-accent"
            >
              All courses
              <ArrowRightIcon
                size={15}
                aria-hidden
                className="transition-transform duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0.5"
              />
            </Link>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <Reveal key={course.documentId} delay={index * 0.08}>
              <CourseCard course={course} priority={index === 0} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Full-width quote. Three lines, real attribution with a role. */
function Testimonial() {
  return (
    <section className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <figure className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
            <blockquote className="text-2xl font-medium leading-snug text-text sm:text-3xl">
              &ldquo;I stopped guessing where I&rsquo;d got to. The percentage matches the lessons I
              actually finished, which sounds obvious until you use a platform where it
              doesn&rsquo;t.&rdquo;
            </blockquote>
            <figcaption className="text-sm text-text-muted">
              Priya Raghunathan, backend engineer at Havenlink
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}

function LatestWriting({ posts }: { posts: Awaited<ReturnType<typeof getPublishedPosts>> }) {
  return (
    <section className="border-t border-line py-24 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading title="Writing" />
        </div>

        <div className="flex flex-col lg:col-span-8">
          {posts.map((post, index) => (
            <Reveal key={post.documentId} delay={index * 0.08}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-2 border-b border-line py-7 transition-colors duration-300 first:border-t hover:border-line-strong"
              >
                <h3 className="text-xl font-semibold text-text transition-colors duration-200 group-hover:text-accent">
                  {post.title}
                </h3>
                {post.excerpt ? (
                  <p className="max-w-[62ch] text-sm leading-relaxed text-text-muted">{post.excerpt}</p>
                ) : null}
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="pb-8 pt-24 lg:pt-32">
      <Container>
        <Reveal>
          <div className="flex flex-col items-center gap-7 rounded-card border border-line bg-surface px-6 py-20 text-center">
            <h2 className="display-tight max-w-[16ch] text-3xl font-semibold sm:text-4xl lg:text-5xl">
              Pick a course and finish it.
            </h2>
            <p className="max-w-[48ch] text-lg text-text-muted">
              Free to join. Enroll, work through the lessons in order, and sit the quiz when you are
              ready.
            </p>
            <ButtonLink href="/signup" size="lg" withArrow>
              Get started
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
