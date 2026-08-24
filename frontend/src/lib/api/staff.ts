import 'server-only';

import { strapiFetchOrNull } from '@/lib/strapi';
import type { RoleType } from '@/lib/types';

/**
 * Staff reads.
 *
 * The scoping is done by the backend, not by a parameter sent from here. `/courses/mine`
 * returns every course to an admin or content manager and only owned courses to an
 * instructor, because the controller reads the role off the JWT. There is no "give me
 * everything" flag this layer could pass.
 */

export type OwnedCourse = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPublished: boolean;
  description: string | null;
  coverImageUrl: string | null;
  owner: { id: number; username: string } | null;
  lessonCount: number;
  quizCount: number;
  enrollmentCount: number;
};

export async function getOwnedCourses(): Promise<OwnedCourse[]> {
  const response = await strapiFetchOrNull<{ data: OwnedCourse[] }>('/courses/mine');

  return response?.data ?? [];
}

export type PlatformStats = {
  users: { total: number; byRole: { role: RoleType; name: string; count: number }[] };
  courses: { total: number; published: number; drafts: number };
  lessons: { total: number };
  quizzes: { total: number; attempts: number };
  enrollments: { total: number };
  blogPosts: { total: number; published: number; drafts: number };
};

export async function getPlatformStats(): Promise<PlatformStats | null> {
  const response = await strapiFetchOrNull<{ data: PlatformStats }>('/platform/stats');

  // Null here means the backend refused the request, which is the correct outcome for
  // anyone who is not an admin. The page renders without the panel rather than erroring.
  return response?.data ?? null;
}
