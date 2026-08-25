import { factories } from '@strapi/strapi';
import type { AuthUser } from '../../../utils/permissions';
import { findCourseByAnyId } from '../../../utils/resolve';
import { computeCourseProgress } from '../../../utils/progress';
import { notify } from '../../../utils/notify';

/**
 * Enrollment is never created through the generic `POST /api/enrollments` route.
 *
 * That route accepts a `student` relation, which would let one student enroll another —
 * or let anyone enroll on behalf of a user id they guessed. It is disabled in the
 * permission grid for every role except admin, and students go through
 * `POST /api/enrollments/enroll`, which takes a course and reads the student from the JWT.
 */
export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  /**
   * POST /api/enrollments/enroll   body: { courseId }
   */
  async enroll(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as {
      courseId?: string | number;
      data?: { courseId?: string | number };
    };

    const courseId = body.courseId ?? body.data?.courseId;

    if (courseId === undefined || courseId === null || courseId === '') {
      return ctx.badRequest('`courseId` is required');
    }

    const course = await findCourseByAnyId(strapi, courseId);

    if (!course) {
      return ctx.notFound('Course not found');
    }

    // Enrolling in an unpublished course would give a student access to half-written
    // lessons the author has not released yet.
    if (!course.isPublished) {
      return ctx.notFound('Course not found');
    }

    // Strapi has no composite unique constraint, so uniqueness of (student, course) is
    // enforced here. 409 rather than a silent success, so the UI can say "already enrolled"
    // instead of pretending it just happened.
    const existing = await strapi.db.query('api::enrollment.enrollment').findOne({
      where: { student: { id: user.id }, course: { id: course.id } },
    });

    if (existing) {
      return ctx.conflict('You are already enrolled in this course');
    }

    const enrollment = await strapi.documents('api::enrollment.enrollment').create({
      data: {
        student: user.id,
        course: course.id,
        enrolledAt: new Date().toISOString(),
      },
    });

    const owner = await strapi.db.query('api::course.course').findOne({
      where: { id: course.id },
      populate: { owner: true },
    });

    await notify(strapi, {
      recipientId: owner?.owner?.id,
      actorId: user.id,
      type: 'course-enrolled',
      title: `${user.username} enrolled in ${course.title}`,
      href: `/studio`,
    });

    ctx.status = 201;

    return {
      data: {
        id: enrollment.id,
        documentId: enrollment.documentId,
        enrolledAt: enrollment.enrolledAt,
        course: { id: course.id, documentId: course.documentId, title: course.title },
      },
    };
  },

  /**
   * GET /api/enrollments/me
   *
   * Powers "My Courses". Progress is computed per course in the same response so the
   * dashboard does not have to fire one request per card.
   */
  async me(ctx) {
    const user = ctx.state.user as AuthUser;

    const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { student: { id: user.id } },
      populate: { course: { populate: { owner: true } } },
      orderBy: { enrolledAt: 'desc' },
    });

    const data = await Promise.all(
      enrollments
        .filter((enrollment: { course?: unknown }) => Boolean(enrollment.course))
        .map(
          async (enrollment: {
            id: number;
            documentId: string;
            enrolledAt: string;
            course: {
              id: number;
              documentId: string;
              title: string;
              slug: string;
              level: string;
              description?: string;
              coverImageUrl?: string;
              isPublished: boolean;
              owner?: { id: number; username: string } | null;
            };
          }) => {
            const progress = await computeCourseProgress(strapi, user.id, enrollment.course.id);

            return {
              id: enrollment.id,
              documentId: enrollment.documentId,
              enrolledAt: enrollment.enrolledAt,
              course: {
                id: enrollment.course.id,
                documentId: enrollment.course.documentId,
                title: enrollment.course.title,
                slug: enrollment.course.slug,
                level: enrollment.course.level,
                description: enrollment.course.description ?? null,
                coverImageUrl: enrollment.course.coverImageUrl ?? null,
                isPublished: enrollment.course.isPublished,
                instructor: enrollment.course.owner
                  ? { id: enrollment.course.owner.id, username: enrollment.course.owner.username }
                  : null,
              },
              progress: {
                completed: progress.completed,
                total: progress.total,
                percentage: progress.percentage,
                completedLessonIds: progress.completedLessonIds,
              },
            };
          }
        )
    );

    return { data };
  },

  /**
   * DELETE /api/enrollments/me/:courseId — a student leaving a course.
   *
   * Their progress rows go with it; leaving and re-joining is a fresh start rather than a
   * resurrection of stale percentages against a syllabus that may have changed.
   */
  async unenroll(ctx) {
    const user = ctx.state.user as AuthUser;

    const course = await findCourseByAnyId(strapi, ctx.params.courseId);

    if (!course) {
      return ctx.notFound('Course not found');
    }

    const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
      where: { student: { id: user.id }, course: { id: course.id } },
    });

    if (!enrollment) {
      return ctx.notFound('You are not enrolled in this course');
    }

    await strapi.db.query('api::lesson-progress.lesson-progress').deleteMany({
      where: { student: { id: user.id }, course: { id: course.id } },
    });

    await strapi.db.query('api::enrollment.enrollment').delete({ where: { id: enrollment.id } });

    return { data: { unenrolled: true, course: course.documentId } };
  },
}));
