import { factories } from '@strapi/strapi';
import type { AuthUser } from '../../../utils/permissions';
import { isEnrolled } from '../../../utils/resolve';
import { computeCourseProgress } from '../../../utils/progress';

/**
 * Marking a lesson complete.
 *
 * Like enrollment, this never goes through the generic create route — that one accepts a
 * `student` relation and would let a student write progress rows for somebody else. The
 * student comes from the JWT, and the only thing the client chooses is which lesson.
 */
export default factories.createCoreController(
  'api::lesson-progress.lesson-progress',
  ({ strapi }) => ({
    /**
     * POST /api/lesson-progresses/complete   body: { lessonId }
     *
     * Idempotent: pressing "mark complete" twice is not an error and does not create a
     * second row, because the percentage counts rows and duplicates would inflate it.
     */
    async complete(ctx) {
      const user = ctx.state.user as AuthUser;

      const body = (ctx.request.body ?? {}) as {
        lessonId?: string | number;
        data?: { lessonId?: string | number };
      };

      const lessonId = body.lessonId ?? body.data?.lessonId;

      if (lessonId === undefined || lessonId === null || lessonId === '') {
        return ctx.badRequest('`lessonId` is required');
      }

      const lesson = await strapi.db.query('api::lesson.lesson').findOne({
        where: /^\d+$/.test(String(lessonId))
          ? { id: Number(lessonId) }
          : { documentId: String(lessonId) },
        populate: { course: true },
      });

      if (!lesson) {
        return ctx.notFound('Lesson not found');
      }

      if (!lesson.course) {
        return ctx.badRequest('This lesson is not attached to a course');
      }

      if (!(await isEnrolled(strapi, user.id, lesson.course.id))) {
        return ctx.forbidden('You must be enrolled in this course to track progress');
      }

      const existing = await strapi.db.query('api::lesson-progress.lesson-progress').findOne({
        where: { student: { id: user.id }, lesson: { id: lesson.id } },
      });

      if (existing) {
        // Already there. If it had been un-completed, flip it back rather than inserting.
        if (!existing.completed) {
          await strapi.db.query('api::lesson-progress.lesson-progress').update({
            where: { id: existing.id },
            data: { completed: true, completedAt: new Date().toISOString() },
          });
        }
      } else {
        await strapi.documents('api::lesson-progress.lesson-progress').create({
          data: {
            student: user.id,
            lesson: lesson.id,
            course: lesson.course.id,
            completed: true,
            completedAt: new Date().toISOString(),
          },
        });
      }

      // Return the recomputed course progress so the UI has the new percentage without a
      // second round trip — and so the number it shows is the server's, not a local guess.
      const progress = await computeCourseProgress(strapi, user.id, lesson.course.id);

      return {
        data: {
          lesson: { id: lesson.id, documentId: lesson.documentId, title: lesson.title },
          completed: true,
          progress,
        },
      };
    },

    /**
     * POST /api/lesson-progresses/uncomplete   body: { lessonId }
     *
     * The undo path. A student who ticked the wrong lesson would otherwise be stuck with a
     * permanently wrong percentage.
     */
    async uncomplete(ctx) {
      const user = ctx.state.user as AuthUser;

      const body = (ctx.request.body ?? {}) as {
        lessonId?: string | number;
        data?: { lessonId?: string | number };
      };

      const lessonId = body.lessonId ?? body.data?.lessonId;

      if (lessonId === undefined || lessonId === null || lessonId === '') {
        return ctx.badRequest('`lessonId` is required');
      }

      const lesson = await strapi.db.query('api::lesson.lesson').findOne({
        where: /^\d+$/.test(String(lessonId))
          ? { id: Number(lessonId) }
          : { documentId: String(lessonId) },
        populate: { course: true },
      });

      if (!lesson || !lesson.course) {
        return ctx.notFound('Lesson not found');
      }

      const existing = await strapi.db.query('api::lesson-progress.lesson-progress').findOne({
        where: { student: { id: user.id }, lesson: { id: lesson.id } },
      });

      if (existing) {
        await strapi.db
          .query('api::lesson-progress.lesson-progress')
          .delete({ where: { id: existing.id } });
      }

      const progress = await computeCourseProgress(strapi, user.id, lesson.course.id);

      return {
        data: {
          lesson: { id: lesson.id, documentId: lesson.documentId, title: lesson.title },
          completed: false,
          progress,
        },
      };
    },
  })
);
