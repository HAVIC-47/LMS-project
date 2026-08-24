import type { Core } from '@strapi/strapi';

/**
 * Progress tracking.
 *
 * The model is deliberately boring: one `LessonProgress` row per (student, lesson) that has
 * been marked complete. There is no counter stored on the enrollment, because a stored
 * counter is a second copy of the truth that drifts the first time a lesson is deleted.
 * The percentage is always derived, so it is correct by construction after any edit:
 *
 *     percentage = completed lessons in this course / total lessons in this course
 *
 * `LessonProgress.course` is denormalized (it could be reached through `lesson.course`)
 * purely so this count is one flat query instead of a join through every lesson.
 *
 * Persistence across refreshes comes for free: the rows are in the database, not in
 * localStorage or React state.
 */

export type CourseProgress = {
  courseId: number;
  completed: number;
  total: number;
  percentage: number;
  completedLessonIds: string[];
};

export const countCourseLessons = (strapi: Core.Strapi, courseId: number): Promise<number> =>
  strapi.db.query('api::lesson.lesson').count({ where: { course: { id: courseId } } });

/**
 * Rows are only ever written when a lesson is completed, but `completed: true` is still
 * filtered on explicitly so that "un-completing" a lesson later is a field flip rather than
 * a delete, and this function keeps working unchanged.
 */
const findCompletedRecords = (strapi: Core.Strapi, userId: number, courseId: number) =>
  strapi.db.query('api::lesson-progress.lesson-progress').findMany({
    where: { student: { id: userId }, course: { id: courseId }, completed: true },
    populate: { lesson: true },
  });

export const computeCourseProgress = async (
  strapi: Core.Strapi,
  userId: number,
  courseId: number
): Promise<CourseProgress> => {
  const [total, records] = await Promise.all([
    countCourseLessons(strapi, courseId),
    findCompletedRecords(strapi, userId, courseId),
  ]);

  // Deleting a lesson leaves its progress rows behind for a moment (Strapi cascades the
  // relation, not the row), and a student could otherwise end up at 6/5 = 120%. Counting
  // distinct *existing* lessons keeps the number honest.
  const completedLessonIds = Array.from(
    new Set(
      records
        .map((record: { lesson?: { documentId?: string } | null }) => record.lesson?.documentId)
        .filter((documentId): documentId is string => Boolean(documentId))
    )
  );

  const completed = Math.min(completedLessonIds.length, total);

  return {
    courseId,
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    completedLessonIds,
  };
};

/** Batch version used by "My Courses" so N enrollments cost N counts, not N round trips. */
export const computeProgressForCourses = async (
  strapi: Core.Strapi,
  userId: number,
  courseIds: number[]
): Promise<Map<number, CourseProgress>> => {
  const entries = await Promise.all(
    courseIds.map(async (courseId) => [courseId, await computeCourseProgress(strapi, userId, courseId)] as const)
  );

  return new Map(entries);
};
