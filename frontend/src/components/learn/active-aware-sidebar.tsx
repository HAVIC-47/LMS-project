'use client';

import { usePathname } from 'next/navigation';
import { LessonSidebar } from './lesson-sidebar';
import type { LessonSummary, QuizSummary } from '@/lib/types';

/**
 * Works out which entry is open from the URL.
 *
 * The sidebar is rendered by the layout, which does not receive the page's params. Reading
 * `usePathname` here keeps the highlight correct without lifting routing state into a
 * context or duplicating the sidebar inside every page.
 */
export function ActiveAwareSidebar(props: {
  slug: string;
  title: string;
  lessons: LessonSummary[];
  quiz: QuizSummary | null;
  completedLessonIds: string[];
  percentage: number;
}) {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  // /learn/[slug]/[lessonId]  or  /learn/[slug]/quiz
  const last = segments.length > 2 ? segments[segments.length - 1] : undefined;

  const quizActive = last === 'quiz';

  return (
    <LessonSidebar
      {...props}
      activeLessonId={quizActive ? undefined : last}
      quizActive={quizActive}
    />
  );
}
