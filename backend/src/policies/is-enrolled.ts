import type { Core } from '@strapi/strapi';
import { isStudent, type AuthUser } from '../utils/permissions';
import {
  findCourseByDocumentId,
  findCourseByLessonDocumentId,
  findCourseByQuizDocumentId,
  isEnrolled,
} from '../utils/resolve';

type Subject = 'course' | 'lesson' | 'quiz';

/**
 * Enrollment gate for student-facing reads and writes.
 *
 *   config: { policies: [{ name: 'global::is-enrolled', config: { subject: 'quiz' } }] }
 *
 * Only students are subject to it — staff already passed a role/ownership check to get
 * here, and a Content Manager should be able to preview a quiz without enrolling in the
 * course. Everyone else must have an Enrollment row for the course that owns `:id`.
 */
export default async (
  policyContext: { state: { user?: unknown }; params: { id?: string } },
  config: { subject?: Subject } | undefined,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = policyContext.state.user as AuthUser | undefined;

  if (!user) {
    return false;
  }

  if (!isStudent(user)) {
    return true;
  }

  const subject = config?.subject ?? 'course';
  const documentId = policyContext.params?.id;

  if (!documentId) {
    return false;
  }

  const resolvers = {
    course: findCourseByDocumentId,
    lesson: findCourseByLessonDocumentId,
    quiz: findCourseByQuizDocumentId,
  } as const;

  const course = await resolvers[subject](strapi, documentId);

  if (!course) {
    return true;
  }

  return isEnrolled(strapi, user.id, course.id);
};
