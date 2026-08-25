import { notFound, redirect } from 'next/navigation';
import { getCourseBySlug } from '@/lib/api/public';
import { getCourseProgress } from '@/lib/api/learn';

/**
 * /learn/[slug] has no view of its own. It resolves where the student should actually be
 * and forwards, so "continue" is a single stable link rather than something every caller
 * has to compute.
 *
 * Resume rule: the first lesson they have not finished. Once everything is done it lands
 * on the last lesson rather than bouncing to the quiz, because re-reading is a normal
 * thing to want and being dropped into an exam is not.
 */
export default async function LearnIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);

  if (lessons.length === 0) {
    redirect(`/courses/${slug}`);
  }

  const progress = await getCourseProgress(course.documentId);
  const done = new Set(progress?.completedLessonIds ?? []);

  const nextUp = lessons.find((lesson) => !done.has(lesson.documentId)) ?? lessons[lessons.length - 1];

  redirect(`/learn/${slug}/${nextUp.documentId}`);
}
