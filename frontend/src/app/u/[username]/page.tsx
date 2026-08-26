import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowUpRightIcon,
  LinkSimpleIcon,
  NotePencilIcon,
  StackIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Avatar } from '@/components/ui/avatar';
import { ButtonLink } from '@/components/ui/button';
import { Container, EmptyState, Stat } from '@/components/ui/primitives';
import { CourseCard } from '@/components/marketing/course-card';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { getProfile } from '@/lib/api/profile';
import { ROLE_LABELS, type Profile } from '@/lib/types';

/**
 * Public profile.
 *
 * `/u/:username` rather than `/profile/:username` for one practical reason: the edit
 * screen needs a URL too, and `/profile/edit` would sit in the same segment as a dynamic
 * `[username]`. Next resolves the static segment first so it would work — right up until
 * somebody registers the username "edit". A separate namespace has no such collision.
 *
 * Every visibility decision is the backend's. This page renders whatever it was given: if
 * a section is empty or a count is zero, that is either because there is nothing there or
 * because the viewer is not entitled to see it, and the page cannot tell the difference.
 * That is the point — there is no client-side filtering to get wrong.
 */

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) return { title: 'Profile not found' };

  const name = profile.displayName || profile.username;

  return {
    title: name,
    description: profile.bio ?? `${name} on CourseCatalyst.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) notFound();

  const name = profile.displayName || profile.username;

  // Sections are shown when there is something in them rather than by role. An admin
  // legitimately has both; a content manager who has also built a course should not have
  // that course hidden because the role table said "blog". The role badge states what
  // someone *is*; these sections state what they have actually done.
  const teaches = profile.teaching.courses.length > 0 || profile.teaching.publishedCourses > 0;
  const writes = profile.writing.posts.length > 0 || profile.writing.publishedPosts > 0;

  return (
    <div className="py-12 lg:py-16">
      <Container className="flex flex-col gap-14">
        <ProfileHeader profile={profile} name={name} />

        {teaches ? <Teaching profile={profile} name={name} /> : null}
        {writes ? <Writing profile={profile} name={name} /> : null}
        {profile.learning ? <Learning learning={profile.learning} /> : null}

        {!teaches && !writes && !profile.learning ? (
          <EmptyState
            icon={<StackIcon size={32} aria-hidden />}
            title="Nothing published yet"
            description={`${name} has not published any courses or posts. Anything they publish will appear here.`}
          />
        ) : null}
      </Container>
    </div>
  );
}

function ProfileHeader({ profile, name }: { profile: Profile; name: string }) {
  return (
    <header className="flex flex-col gap-8 border-b border-line pb-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <Avatar src={profile.avatarUrl} name={name} size="xl" />

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="display-tight font-serif text-[2rem] font-normal text-text sm:text-[2.75rem]">
              {name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-muted">
              <span className="font-mono text-text-subtle">@{profile.username}</span>

              {profile.role ? (
                <>
                  <span aria-hidden className="h-px w-4 bg-line-strong" />
                  {/* The role is the one label the spec asks for by name, so it gets the
                      accent rather than being another grey chip in a row of grey chips. */}
                  <span className="rounded-control bg-accent px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-ink-on">
                    {ROLE_LABELS[profile.role]}
                  </span>
                </>
              ) : null}

              <span aria-hidden className="h-px w-4 bg-line-strong" />
              <span>Joined {formatDate(profile.joinedAt)}</span>
            </div>
          </div>

          {profile.bio ? (
            <p className="max-w-[62ch] text-lg leading-relaxed text-text-muted">{profile.bio}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            {profile.website ? (
              <a
                href={profile.website}
                // The address is user-supplied and points off-site, so the link is opened
                // detached: `noopener` denies it `window.opener`, `nofollow` keeps a
                // profile page from becoming a link farm.
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group flex items-center gap-2 text-sm text-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
              >
                <LinkSimpleIcon size={15} aria-hidden />
                {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            ) : null}

            {profile.isSelf ? (
              <>
                {profile.email ? (
                  <span className="text-sm text-text-subtle">{profile.email}</span>
                ) : null}
                <ButtonLink href="/settings/profile" variant="outline" size="sm">
                  Edit profile
                </ButtonLink>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Instructor view: what they have built and who is taking it. */
function Teaching({ profile, name }: { profile: Profile; name: string }) {
  const { teaching } = profile;

  return (
    <section className="flex flex-col gap-8">
      <h2 className="display-tight font-serif text-[1.75rem] font-normal sm:text-[2rem]">
        {profile.isSelf ? 'Your courses' : `Courses by ${name}`}
      </h2>

      <dl className="flex flex-wrap gap-x-14 gap-y-8 border-y border-line py-8">
        <Stat value={teaching.publishedCourses} label="published" />
        {/* Only ever differs from the published count on your own profile — the backend
            collapses the two for a visitor rather than sending a number to hide. */}
        {profile.isSelf && teaching.totalCourses !== teaching.publishedCourses ? (
          <Stat value={teaching.totalCourses - teaching.publishedCourses} label="unpublished" />
        ) : null}
        <Stat value={teaching.lessons} label="lessons written" />
        <Stat value={teaching.quizzes} label="quizzes" />
        <Stat value={teaching.students} label={teaching.students === 1 ? 'student' : 'students'} />
      </dl>

      {teaching.courses.length > 0 ? (
        <div
          className={cn(
            'grid gap-6',
            teaching.courses.length === 1
              ? 'sm:grid-cols-1'
              : teaching.courses.length === 2
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {teaching.courses.map((course, index) => (
            <Reveal key={course.documentId} delay={Math.min(index, 5) * 0.05}>
              <div className="relative h-full">
                <CourseCard
                  course={{
                    // `id` is not in the profile payload and the card never reads it —
                    // the backend projects courses down to what a card needs. Zero rather
                    // than widening the shared `Course` type for one call site.
                    id: 0,
                    documentId: course.documentId,
                    title: course.title,
                    slug: course.slug,
                    description: course.description,
                    level: course.level,
                    coverImageUrl: course.coverImageUrl,
                    isPublished: course.isPublished,
                    lessonCount: course.lessonCount,
                  }}
                  priority={index === 0}
                />
                {/* Drafts are only ever in this list on your own profile, so the badge
                    needs no viewer check of its own. */}
                {!course.isPublished ? (
                  <span className="pointer-events-none absolute right-3 top-3 rounded-control bg-page/90 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted backdrop-blur-md">
                    Draft
                  </span>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** Content manager view: what they have written. */
function Writing({ profile, name }: { profile: Profile; name: string }) {
  const { writing } = profile;

  return (
    <section className="flex flex-col gap-8">
      <h2 className="display-tight font-serif text-[1.75rem] font-normal sm:text-[2rem]">
        {profile.isSelf ? 'Your writing' : `Writing by ${name}`}
      </h2>

      <dl className="flex flex-wrap gap-x-14 gap-y-8 border-y border-line py-8">
        <Stat value={writing.publishedPosts} label="published posts" />
        {profile.isSelf && writing.draftPosts > 0 ? (
          <Stat value={writing.draftPosts} label="drafts" />
        ) : null}
      </dl>

      {writing.posts.length > 0 ? (
        <ul className="flex flex-col">
          {writing.posts.map((post) => (
            <li key={post.documentId}>
              {/* A ruled index rather than another card grid. Two card grids stacked on one
                  page stop reading as two different things. */}
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-1.5 border-t border-line py-5 transition-colors duration-300 [transition-timing-function:var(--ease-settle)] last:border-b hover:border-line-strong sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="microlabel shrink-0 sm:w-28">
                  {post.publishedAt ? formatDate(post.publishedAt) : 'Draft'}
                </span>

                <span className="flex flex-1 items-baseline gap-2">
                  <span className="font-serif text-lg leading-snug text-text">{post.title}</span>
                  <ArrowUpRightIcon
                    size={14}
                    aria-hidden
                    className="shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </span>

                {post.excerpt ? (
                  <span className="line-clamp-2 max-w-[42ch] text-sm leading-relaxed text-text-muted">
                    {post.excerpt}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<NotePencilIcon size={32} aria-hidden />}
          title="No published posts"
          description={`Nothing from ${name} is live yet.`}
        />
      )}
    </section>
  );
}

/** Self only. Nobody else needs to know how far along someone is. */
function Learning({ learning }: { learning: NonNullable<Profile['learning']> }) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="display-tight font-serif text-[1.75rem] font-normal sm:text-[2rem]">
          Your learning
        </h2>
        <span className="microlabel">Only visible to you</span>
      </div>

      <dl className="flex flex-wrap gap-x-14 gap-y-8 border-y border-line py-8">
        <Stat value={learning.enrolledCourses} label="enrolled" />
        <Stat value={learning.lessonsCompleted} label="lessons completed" />
        <Stat value={learning.quizzesTaken} label="quizzes taken" />
        <Stat value={learning.quizzesPassed} label="quizzes passed" />
      </dl>
    </section>
  );
}
