import 'server-only';

import { strapiFetch, strapiFetchOrNull, strapiQuery } from '@/lib/strapi';
import type { CourseLevel, Lesson, StrapiListResponse } from '@/lib/types';

/**
 * Reads for the authoring screens.
 *
 * These return the *full* records, including lesson bodies and the quiz answer key, which
 * the public and student endpoints deliberately strip. That is safe because every one of
 * these routes is staff-only in the permission matrix and scoped by ownership on the
 * backend: an instructor's list already contains only their own courses before it reaches
 * this layer.
 */

export type AuthoredLesson = Lesson & { course?: { documentId: string } | null };

export async function getLessonsForCourse(courseDocumentId: string): Promise<AuthoredLesson[]> {
  const query = strapiQuery({
    filters: { course: { documentId: { $eq: courseDocumentId } } },
    sort: ['order:asc'],
    pagination: { pageSize: 100 },
  });

  const response = await strapiFetchOrNull<StrapiListResponse<AuthoredLesson>>(`/lessons${query}`);

  return response?.data ?? [];
}

export type AuthoredQuestion = {
  id: number;
  documentId: string;
  prompt: string;
  options: string[];
  /** Present here and nowhere a student can reach. */
  correctIndex: number;
  order: number;
};

export type AuthoredQuiz = {
  id: number;
  documentId: string;
  title: string;
  description: string | null;
  passingScore: number;
  questions?: AuthoredQuestion[];
};

export async function getQuizForCourse(courseDocumentId: string): Promise<AuthoredQuiz | null> {
  const query = strapiQuery({
    filters: { course: { documentId: { $eq: courseDocumentId } } },
    populate: { questions: true },
    pagination: { pageSize: 1 },
  });

  const response = await strapiFetchOrNull<StrapiListResponse<AuthoredQuiz>>(`/quizzes${query}`);
  const quiz = response?.data?.[0];

  if (!quiz) return null;

  return {
    ...quiz,
    questions: [...(quiz.questions ?? [])].sort((a, b) => a.order - b.order),
  };
}

export type StudentProgressRow = {
  student: { id: number; username: string; email: string };
  enrolledAt: string;
  completed: number;
  total: number;
  percentage: number;
  bestQuizScore: number | null;
};

export async function getStudentsProgress(courseDocumentId: string): Promise<StudentProgressRow[]> {
  const response = await strapiFetchOrNull<{ data: { students: StudentProgressRow[] } }>(
    `/courses/${courseDocumentId}/students-progress`
  );

  return response?.data?.students ?? [];
}

export type AuthoredPost = {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  updatedAt: string;
  isPublished: boolean;
  author: { id: number; username: string } | null;
};

export async function getAuthoredPosts(): Promise<AuthoredPost[]> {
  const response = await strapiFetchOrNull<{ data: AuthoredPost[] }>('/blog-posts/mine');

  return response?.data ?? [];
}

/** A single post for the editor, including its body and whichever version is current. */
export async function getPostForEditing(documentId: string) {
  const response = await strapiFetchOrNull<{
    data: {
      documentId: string;
      title: string;
      slug: string;
      excerpt: string | null;
      body: string | null;
      coverImageUrl: string | null;
      publishedAt: string | null;
    };
  }>(`/blog-posts/${documentId}?status=draft`);

  return response?.data ?? null;
}

export type PlatformUser = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  role: { id: number; name: string; type: string } | null;
  ownedCourses: number;
  enrollments: number;
};

export async function getPlatformUsers(): Promise<PlatformUser[]> {
  const response = await strapiFetchOrNull<{ data: PlatformUser[] }>('/platform/users');

  return response?.data ?? [];
}

export const COURSE_LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];

export type { StrapiListResponse };
export { strapiFetch };
