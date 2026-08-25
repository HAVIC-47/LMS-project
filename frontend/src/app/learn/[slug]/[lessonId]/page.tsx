import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr';
import { Panel } from '@/components/ui/primitives';
import { CompleteButton } from '@/components/learn/complete-button';
import { getCourseBySlug } from '@/lib/api/public';
import { getCourseProgress, getLesson, toEmbedUrl } from '@/lib/api/learn';
import { toParagraphs } from '@/lib/format';

type PageProps = { params: Promise<{ slug: string; lessonId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  return { title: lesson?.title ?? 'Lesson' };
}

/**
 * Lesson viewer.
 *
 * This is the one page that renders lesson content, and it gets that content from
 * `GET /api/lessons/:id`, which the backend refuses unless the caller is enrolled. Every
 * other surface in the app receives lessons with `body` and `videoUrl` already stripped,
 * so there is exactly one door and it is guarded.
 */
export default async function LessonPage({ params }: PageProps) {
  const { slug, lessonId } = await params;

  const [course, lesson] = await Promise.all([getCourseBySlug(slug), getLesson(lessonId)]);

  if (!course || !lesson) {
    notFound();
  }

  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const index = lessons.findIndex((entry) => entry.documentId === lessonId);

  // A lesson id that does not belong to this course is a wrong URL, not a permission
  // problem: the sidebar and the content would disagree about which course you are in.
  if (index === -1) {
    notFound();
  }

  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;
  const quiz = course.quizzes?.[0] ?? null;

  const progress = await getCourseProgress(course.documentId);
  const completed = progress?.completedLessonIds.includes(lessonId) ?? false;

  const embedUrl = lesson.contentType === 'video' ? toEmbedUrl(lesson.videoUrl) : null;
  const paragraphs = toParagraphs(lesson.body);

  // After the last lesson the natural next step is the quiz, if there is one.
  const nextHref = next
    ? `/learn/${slug}/${next.documentId}`
    : quiz
      ? `/learn/${slug}/quiz`
      : null;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="microlabel">
          Lesson {String(index + 1).padStart(2, '0')} of {String(lessons.length).padStart(2, '0')}
        </span>
        <h1 className="display-tight text-3xl font-semibold sm:text-4xl">{lesson.title}</h1>
      </header>

      {lesson.contentType === 'video' ? (
        embedUrl ? (
          <Panel className="overflow-hidden">
            {/* 16:9 wrapper reserves the space before the iframe loads, so nothing jumps. */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={embedUrl}
                title={lesson.title}
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="absolute inset-0 size-full"
              />
            </div>
          </Panel>
        ) : (
          // An unrecognised host is shown as a link rather than an empty black box, so a
          // broken embed never looks like a broken page.
          <Panel className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-text-muted">This video is hosted somewhere we cannot embed.</p>
            {lesson.videoUrl ? (
              <a
                href={lesson.videoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 text-sm font-medium text-accent-text"
              >
                Open the video
                <ArrowSquareOutIcon size={15} aria-hidden />
              </a>
            ) : null}
          </Panel>
        )
      ) : null}

      {paragraphs.length > 0 ? (
        <div className="flex max-w-[68ch] flex-col gap-5">
          {paragraphs.map((paragraph, position) => (
            <p key={position} className="text-lg leading-relaxed text-text">
              {paragraph}
            </p>
          ))}
        </div>
      ) : lesson.contentType === 'text' ? (
        <p className="text-text-muted">This lesson has no written content yet.</p>
      ) : null}

      <div className="border-t border-line pt-7">
        <CompleteButton lessonId={lesson.documentId} completed={completed} nextHref={nextHref} />
      </div>

      <nav className="flex items-center justify-between gap-4 border-t border-line pt-6 text-sm">
        {previous ? (
          <Link
            href={`/learn/${slug}/${previous.documentId}`}
            className="group flex max-w-[45%] items-center gap-2 text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeftIcon
              size={15}
              aria-hidden
              className="shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:-translate-x-0.5"
            />
            <span className="truncate">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            href={`/learn/${slug}/${next.documentId}`}
            className="group flex max-w-[45%] items-center gap-2 text-right text-text-muted transition-colors hover:text-text"
          >
            <span className="truncate">{next.title}</span>
            <span aria-hidden className="shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
