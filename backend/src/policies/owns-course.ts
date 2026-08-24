import type { Core } from '@strapi/strapi';
import { canManageCourse, type AuthUser } from '../utils/permissions';
import {
  findCourseByDocumentId,
  findCourseByLessonDocumentId,
  findCourseByQuestionDocumentId,
  findCourseByQuizDocumentId,
} from '../utils/resolve';

type Subject = 'course' | 'lesson' | 'quiz' | 'question';

/**
 * Ownership gate for routes that already identify a record in the URL.
 *
 *   config: { policies: [{ name: 'global::owns-course', config: { subject: 'lesson' } }] }
 *
 * Admin and Content Manager pass for any course; an Instructor passes only for courses
 * they own. `subject` says how to walk from the record in `:id` back to its course —
 * a lesson, a quiz and a question all belong to exactly one course.
 *
 * Routes that *create* a record cannot use this policy (there is no `:id` yet); those
 * checks live in the controllers, which read the parent course out of the request body.
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

  const subject = config?.subject ?? 'course';
  const documentId = policyContext.params?.id;

  if (!documentId) {
    return false;
  }

  const resolvers = {
    course: findCourseByDocumentId,
    lesson: findCourseByLessonDocumentId,
    quiz: findCourseByQuizDocumentId,
    question: findCourseByQuestionDocumentId,
  } as const;

  const course = await resolvers[subject](strapi, documentId);

  // A missing record is not an authorization decision — let the controller answer 404.
  if (!course) {
    return true;
  }

  return canManageCourse(user, course);
};
