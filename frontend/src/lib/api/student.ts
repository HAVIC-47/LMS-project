import 'server-only';

import { strapiFetchOrNull } from '@/lib/strapi';
import type { Enrollment } from '@/lib/types';

/**
 * Student reads.
 *
 * These carry the caller's token, so Strapi scopes them to the signed-in user. There is no
 * student id in any of these paths: the backend takes the identity from the JWT, which is
 * why one student cannot ask for another's progress by changing a number in a URL.
 */

export async function getMyEnrollments(): Promise<Enrollment[]> {
  const response = await strapiFetchOrNull<{ data: Enrollment[] }>('/enrollments/me');

  // Null means 401/403, i.e. not signed in or not a student. Both are "no enrollments"
  // as far as any page rendering this is concerned.
  return response?.data ?? [];
}

export async function isEnrolledInCourse(courseDocumentId: string): Promise<boolean> {
  const enrollments = await getMyEnrollments();

  return enrollments.some((enrollment) => enrollment.course.documentId === courseDocumentId);
}
