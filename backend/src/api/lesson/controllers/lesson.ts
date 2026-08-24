import { factories } from '@strapi/strapi';
import {
  canManageCourse,
  isInstructor,
  isStudent,
  type AuthUser,
} from '../../../utils/permissions';
import {
  findCourseByAnyId,
  findCourseByLessonDocumentId,
  isEnrolled,
  readRelationInput,
} from '../../../utils/resolve';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
  /**
   * Lesson listing is always scoped, never global.
   *
   *   Student   -> lessons of courses they are enrolled in
   *   Instructor-> lessons of courses they own
   *   Admin/CM  -> everything
   *
   * The scope is applied as a `course.id.$in` filter that replaces whatever the client
   * sent, so there is no query string that widens it.
   */
  async find(ctx) {
    const user = ctx.state.user as AuthUser;

    if (isStudent(user)) {
      const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
        where: { student: { id: user.id } },
        populate: { course: true },
      });

      const courseIds = enrollments
        .map((enrollment: { course?: { id: number } | null }) => enrollment.course?.id)
        .filter((id: number | undefined): id is number => typeof id === 'number');

      // No enrollments means no lessons — and an empty `$in` would match everything,
      // so short-circuit with an explicit empty page.
      if (courseIds.length === 0) {
        return { data: [], meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } };
      }

      ctx.query = {
        ...ctx.query,
        filters: { ...(ctx.query?.filters as object), course: { id: { $in: courseIds } } },
      };
    } else if (isInstructor(user)) {
      ctx.query = {
        ...ctx.query,
        filters: { ...(ctx.query?.filters as object), course: { owner: { id: user.id } } },
      };
    }

    return super.find(ctx);
  },

  /**
   * Reading a single lesson is where the actual content (text body or video URL) is
   * handed over, so this is the check that matters: enrolled students and the staff who
   * can manage the course, nobody else.
   */
  async findOne(ctx) {
    const user = ctx.state.user as AuthUser;
    const course = await findCourseByLessonDocumentId(strapi, ctx.params.id);

    if (!course) {
      return ctx.notFound('Lesson not found');
    }

    if (canManageCourse(user, course)) {
      return super.findOne(ctx);
    }

    if (isStudent(user) && (await isEnrolled(strapi, user.id, course.id))) {
      return super.findOne(ctx);
    }

    return ctx.forbidden('You must be enrolled in this course to view its lessons');
  },

  /**
   * Creating a lesson has no `:id` for `global::owns-course` to inspect, so the parent
   * course is read out of the request body and checked here. This is the hole an
   * instructor would otherwise use to attach content to somebody else's course.
   */
  async create(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const data = body.data ?? {};

    const course = await findCourseByAnyId(strapi, readRelationInput(data.course));

    if (!course) {
      return ctx.badRequest('A valid `course` relation is required to create a lesson');
    }

    if (!canManageCourse(user, course)) {
      return ctx.forbidden('You cannot add lessons to this course');
    }

    return super.create(ctx);
  },

  /**
   * `global::owns-course` has cleared the caller for the lesson's *current* course. Moving
   * a lesson to a different course needs the same clearance on the destination, otherwise
   * an instructor could push a lesson into a course they do not own.
   */
  async update(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const requestedCourse = readRelationInput(body.data?.course);

    if (requestedCourse !== null) {
      const destination = await findCourseByAnyId(strapi, requestedCourse);

      if (!destination) {
        return ctx.badRequest('The `course` relation does not point at an existing course');
      }

      if (!canManageCourse(user, destination)) {
        return ctx.forbidden('You cannot move this lesson into that course');
      }
    }

    return super.update(ctx);
  },
}));
