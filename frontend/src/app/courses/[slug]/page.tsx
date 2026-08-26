import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  LockSimpleIcon,
  PlayCircleIcon,
  QuestionIcon,
  SealCheckIcon,
  TextAlignLeftIcon,
} from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Container, LevelBadge, Panel } from '@/components/ui/primitives';
import { EnrollButton, EnrolledNotice } from '@/components/marketing/enroll-button';
import { getCourseBySlug } from '@/lib/api/public';
import { isEnrolledInCourse } from '@/lib/api/student';
import { getSessionUser } from '@/lib/session';
import { ReviewPanel } from '@/components/reviews/review-panel';
import { ROLES } from '@/lib/types';
import { isRenderableImage } from '@/lib/format';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return { title: 'Course not found' };
  }

  return {
    title: course.title,
    description: course.description ?? undefined,
  };
}

/**
 * Course detail.
 *
 * The syllabus is visible to everyone, the content is not. That split is enforced on the
 * backend: the course endpoint replaces every lesson body and video URL with a `hasContent`
 * flag before responding, so this page could not leak a lesson even if it tried to render
 * one. Reading the actual material happens at /learn, behind an enrollment check.
 */
export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(slug), getSessionUser()]);

  if (!course) {
    notFound();
  }

  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const quiz = course.quizzes?.[0] ?? null;
  const isStudent = user?.role === ROLES.STUDENT;

  // Only a student can be enrolled, so the extra request is skipped for everyone else.
  const enrolled = isStudent ? await isEnrolledInCourse(course.documentId) : false;

  // A UI hint only. Whether this person may rate or remove a review is decided again by
  // the backend on every write.
  const viewer = user
    ? {
        id: user.id,
        canModerate: user.role === ROLES.ADMIN || user.role === ROLES.CONTENT_MANAGER,
      }
    : null;

  return (
    <article className="py-16 lg:py-20">
      <Container className="flex flex-col gap-14">
        <header className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={course.level} />
              {quiz ? <Badge tone="accent">Graded quiz</Badge> : null}
            </div>

            <h1 className="display-tight text-4xl font-semibold sm:text-5xl">{course.title}</h1>

            {course.description ? (
              <p className="max-w-[56ch] text-lg leading-relaxed text-text-muted">
                {course.description}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
              {course.instructor ? (
                <span>
                  Taught by{' '}
                  <Link
                    href={`/u/${course.instructor.username}`}
                    className="text-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
                  >
                    {course.instructor.username}
                  </Link>
                </span>
              ) : null}
              <span>
                <span className="font-mono tabular-nums text-text">{lessons.length}</span>{' '}
                {lessons.length === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>

            {/*
              Stated before enrolling, not discovered afterwards. The certificate is the
              reason to finish rather than to skim, and a reward nobody knows about cannot
              motivate anything.

              The wording tracks the actual rule: a course with no quiz needs only the
              lessons, because requiring a pass on an assessment that does not exist would
              make those courses uncompletable. Promising a quiz that is not there would be
              the same mistake in reverse.
            */}
            {lessons.length > 0 ? (
              <p className="flex items-start gap-2.5 rounded-card border border-line bg-surface px-4 py-3 text-sm text-text-muted">
                <SealCheckIcon
                  size={16}
                  weight="fill"
                  aria-hidden
                  className="mt-0.5 shrink-0 text-accent"
                />
                <span>
                  {quiz
                    ? 'Finish every lesson and pass the quiz to earn a certificate you can share and anyone can verify.'
                    : 'Finish every lesson to earn a certificate you can share and anyone can verify.'}
                </span>
              </p>
            ) : null}

            <EnrollCta
              isStudent={isStudent}
              signedIn={Boolean(user)}
              slug={course.slug}
              courseId={course.documentId}
              enrolled={enrolled}
            />
          </div>

          {isRenderableImage(course.coverImageUrl) ? (
            <div className="lg:col-span-5">
              <Panel className="overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={course.coverImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                    className="object-cover"
                  />
                </div>
              </Panel>
            </div>
          ) : null}
        </header>

        <section className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
            <h2 className="text-2xl font-semibold">What is inside</h2>
            <p className="text-sm text-text-subtle">Enroll to open the lessons</p>
          </div>

          {lessons.length === 0 ? (
            <p className="py-8 text-text-muted">
              The instructor has not added any lessons to this course yet.
            </p>
          ) : (
            <ol className="flex flex-col">
              {lessons.map((lesson, index) => (
                <li
                  key={lesson.documentId}
                  className="flex items-center gap-4 border-b border-line py-4"
                >
                  <span className="w-6 shrink-0 font-mono text-sm tabular-nums text-text-subtle">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="shrink-0 text-text-subtle" aria-hidden>
                    {lesson.contentType === 'video' ? (
                      <PlayCircleIcon size={18} />
                    ) : (
                      <TextAlignLeftIcon size={18} />
                    )}
                  </span>

                  <span className="flex-1 text-text">{lesson.title}</span>

                  <LockSimpleIcon
                    size={15}
                    className="shrink-0 text-text-subtle"
                    aria-label="Locked until you enroll"
                  />
                </li>
              ))}

              {quiz ? (
                <li className="flex items-center gap-4 border-b border-line py-4">
                  <span className="w-6 shrink-0" aria-hidden />
                  <span className="shrink-0 text-accent-text" aria-hidden>
                    <QuestionIcon size={18} />
                  </span>
                  <span className="flex-1 text-text">
                    {quiz.title}
                    <span className="ml-2 text-sm text-text-subtle">
                      pass mark{' '}
                      <span className="font-mono tabular-nums">{quiz.passingScore}%</span>
                    </span>
                  </span>
                  <LockSimpleIcon
                    size={15}
                    className="shrink-0 text-text-subtle"
                    aria-label="Locked until you enroll"
                  />
                </li>
              ) : null}
            </ol>
          )}
        </section>

        {/*
          Enrollment is the qualification to rate a course. That excludes staff by
          construction, which is deliberate: an instructor rating their own course is not a
          review, and a catalog whose stars can be set by anyone with an account is worth
          less than no stars at all. The backend enforces it; this only explains why.
        */}
        <div className="mx-auto w-full max-w-[68ch]">
          <ReviewPanel
            targetType="course"
            targetDocumentId={course.documentId}
            viewer={viewer}
            canReview={isStudent && enrolled}
            cannotReviewReason={
              isStudent
                ? 'Enroll in this course to rate it.'
                : 'Only students enrolled in a course can rate it.'
            }
          />
        </div>
      </Container>
    </article>
  );
}

/**
 * The call to action changes with who is looking.
 *
 * Enrolling is a student-only action in the permission matrix, so an instructor or admin is
 * told that plainly instead of being shown a button that would come back 403 from the
 * backend. A logged-out visitor is sent to sign up, with the course they were looking at
 * carried in `next` so they land back here.
 */
function EnrollCta({
  isStudent,
  signedIn,
  slug,
  courseId,
  enrolled,
}: {
  isStudent: boolean;
  signedIn: boolean;
  slug: string;
  courseId: string;
  enrolled: boolean;
}) {
  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href={`/signup?next=/courses/${slug}`} size="lg" withArrow>
          Get started
        </ButtonLink>
        <p className="text-sm text-text-muted">
          Already have an account?{' '}
          <Link href={`/login?next=/courses/${slug}`} className="font-medium text-accent-text">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  if (!isStudent) {
    return (
      <p className="rounded-input border border-line bg-surface px-4 py-3 text-sm text-text-muted">
        Enrollment is for student accounts. Your role can manage course content instead.
      </p>
    );
  }

  if (enrolled) {
    return (
      <div className="flex flex-col gap-3">
        <EnrolledNotice />
        <ButtonLink href={`/learn/${slug}`} size="lg" withArrow>
          Continue the course
        </ButtonLink>
      </div>
    );
  }

  return <EnrollButton courseId={courseId} />;
}
