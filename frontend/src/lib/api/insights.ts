import 'server-only';

import { strapiFetchOrNull, strapiQuery } from '@/lib/strapi';
import type { CourseLevel } from '@/lib/types';

/**
 * Reads for the dashboards.
 *
 * All three are staff-scoped on the backend: an instructor's course insights are refused
 * for a course they do not own, and the blog read is filtered to the caller's own posts
 * unless they are an admin. Nothing here re-checks that — it would be a second opinion
 * about a decision already made, and the two would eventually disagree.
 */

export type InsightAnswer = {
  questionId: string;
  prompt: string;
  options: string[];
  /** Null when the student skipped the question. */
  selectedIndex: number | null;
  correctIndex: number | null;
  /** Null for a skipped question or one deleted since — not the same as wrong. */
  correct: boolean | null;
};

export type InsightAttempt = {
  documentId: string;
  quizDocumentId: string | null;
  quizTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  submittedAt: string;
  answers: InsightAnswer[];
};

export type InsightStudent = {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  enrolledAt: string;
  progress: { completed: number; total: number; percentage: number };
  completedLessonIds: string[];
  attempts: InsightAttempt[];
  bestScore: number | null;
};

export type CourseInsights = {
  course: { documentId: string; title: string; slug: string; isPublished: boolean };
  lessons: { documentId: string; title: string; order: number; completedCount: number }[];
  quizzes: {
    documentId: string;
    title: string;
    passingScore: number;
    questionCount: number;
    questions: {
      documentId: string;
      prompt: string;
      options: string[];
      correctIndex: number;
      order: number;
    }[];
    attemptCount: number;
    averageScore: number;
    passRate: number;
  }[];
  students: InsightStudent[];
  summary: {
    students: number;
    lessons: number;
    averageCompletion: number;
    finished: number;
    started: number;
    notStarted: number;
    attempts: number;
    averageScore: number;
    passRate: number;
  };
};

export async function getCourseInsights(documentId: string): Promise<CourseInsights | null> {
  const response = await strapiFetchOrNull<{ data: CourseInsights }>(
    `/courses/${documentId}/insights`
  );

  return response?.data ?? null;
}

export type BlogInsightPost = {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  updatedAt: string;
  publishedAt: string | null;
  isPublished: boolean;
  author: { id: number; username: string } | null;
  comments: number;
  likes: number;
};

export type BlogInsights = {
  posts: BlogInsightPost[];
  months: { month: string; label: string; published: number }[];
  summary: {
    total: number;
    published: number;
    drafts: number;
    comments: number;
    likes: number;
    averageEngagement: number;
  };
};

export async function getBlogInsights(): Promise<BlogInsights | null> {
  const response = await strapiFetchOrNull<{ data: BlogInsights }>('/blog-posts/insights');

  return response?.data ?? null;
}

export type UserFilters = {
  search?: string;
  role?: string;
  status?: string;
};

export type PlatformUserRow = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  role: { id: number; name: string; type: string } | null;
  ownedCourses: number;
  enrollments: number;
};

/**
 * The admin user list, filtered by the backend.
 *
 * Empty values are dropped rather than sent as `?search=`, so a cleared field produces the
 * same request as never having typed in it — otherwise the URL accumulates dead parameters
 * and the "is anything filtered" check has to know that `''` means no.
 */
export async function getPlatformUsers(filters: UserFilters = {}): Promise<PlatformUserRow[]> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => typeof value === 'string' && value.length > 0)
  );

  const query = Object.keys(params).length > 0 ? strapiQuery(params) : '';

  const response = await strapiFetchOrNull<{ data: PlatformUserRow[] }>(
    `/platform/users${query}`
  );

  return response?.data ?? [];
}

export type { CourseLevel };
