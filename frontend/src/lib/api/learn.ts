import 'server-only';

import { strapiFetchOrNull } from '@/lib/strapi';
import type { CourseProgress, Lesson } from '@/lib/types';

/**
 * Reads for the course player.
 *
 * Every call here carries the caller's token and every one of them is scoped by Strapi to
 * that caller. None of these paths contains a student id, so there is no number to change
 * in a URL to read somebody else's lesson, progress or score.
 */

export async function getLesson(lessonDocumentId: string): Promise<Lesson | null> {
  // 403 for a student who is not enrolled, which `strapiFetchOrNull` turns into null so
  // the page can render "not available" instead of throwing.
  const response = await strapiFetchOrNull<{ data: Lesson }>(`/lessons/${lessonDocumentId}`);

  return response?.data ?? null;
}

export async function getCourseProgress(courseDocumentId: string): Promise<CourseProgress | null> {
  const response = await strapiFetchOrNull<{
    data: CourseProgress & { course: { documentId: string; title: string } };
  }>(`/courses/${courseDocumentId}/my-progress`);

  return response?.data ?? null;
}

export type StudentQuizQuestion = {
  id: number;
  documentId: string;
  prompt: string;
  options: string[];
  order: number;
};

export type StudentQuiz = {
  id: number;
  documentId: string;
  title: string;
  description: string | null;
  passingScore: number;
  course: { documentId: string; title: string } | null;
  /** `correctIndex` is stripped by the backend, so it is absent from this type by design. */
  questions: StudentQuizQuestion[];
};

export async function getQuizToTake(quizDocumentId: string): Promise<StudentQuiz | null> {
  const response = await strapiFetchOrNull<{ data: StudentQuiz }>(`/quizzes/${quizDocumentId}/take`);

  return response?.data ?? null;
}

export type QuizAttempt = {
  id: number;
  documentId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  submittedAt: string;
  quiz: { documentId: string; title: string; passingScore: number } | null;
  course: { documentId: string; title: string } | null;
};

export async function getMyAttempts(): Promise<QuizAttempt[]> {
  const response = await strapiFetchOrNull<{ data: QuizAttempt[] }>('/quiz-attempts/me');

  return response?.data ?? [];
}

/**
 * Turns a pasted video link into something an iframe can load.
 *
 * Instructors paste whatever the address bar gave them, which for YouTube is a `watch?v=`
 * URL that refuses to render in a frame. Returning null rather than guessing means an
 * unrecognised host shows a plain link instead of a silently broken black rectangle.
 */
export function toEmbedUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.searchParams.get('v');
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }

  // Already an embed URL from a known player.
  if (host.endsWith('youtube-nocookie.com') || host.endsWith('player.vimeo.com')) {
    return url.toString();
  }

  return null;
}
