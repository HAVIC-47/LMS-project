import type { Core } from '@strapi/strapi';
import { factories } from '@strapi/strapi';
import {
  canManageAllCourses,
  canManageCourse,
  isInstructor,
  isStaff,
  isStudent,
  type AuthUser,
} from '../../../utils/permissions';
import { findCourseByDocumentId, isEnrolled, linkUserRelation, readRelationInput } from '../../../utils/resolve';
import { sanitizeCourseResponse } from '../../../utils/sanitize';
import { computeCourseProgress } from '../../../utils/progress';
import { findEnrolledStudentIds, notifyMany } from '../../../utils/notify';

/**
 * Attaches the course owner as an `instructor` field.
 *
 * `?populate=owner` cannot do this: the content API strips any relation whose target the
 * caller lacks `find` permission on, and no application role is granted
 * `plugin::users-permissions.user.find` — the user list stays closed. So the owner is
 * looked up server-side and projected down to the two fields a course card needs.
 */
const attachInstructors = async (
  strapi: Core.Strapi,
  response: { data?: unknown }
): Promise<{ data?: unknown }> => {
  if (!response || typeof response !== 'object' || !response.data) return response;

  const entries = (Array.isArray(response.data) ? response.data : [response.data]) as {
    documentId?: string;
  }[];

  const documentIds = entries.map((entry) => entry?.documentId).filter(Boolean) as string[];

  if (documentIds.length === 0) return response;

  const rows = await strapi.db.query('api::course.course').findMany({
    where: { documentId: { $in: documentIds } },
    populate: { owner: true },
  });

  const ownerByDocument = new Map<string, { id: number; username: string } | null>(
    (rows as { documentId: string; owner?: { id: number; username: string } | null }[]).map((row) => [
      row.documentId,
      row.owner ? { id: row.owner.id, username: row.owner.username } : null,
    ])
  );

  const decorate = (entry: { documentId?: string }) =>
    entry?.documentId
      ? { ...entry, instructor: ownerByDocument.get(entry.documentId) ?? null }
      : entry;

  return {
    ...response,
    data: Array.isArray(response.data) ? entries.map(decorate) : decorate(entries[0]),
  };
};

/**
 * Attaches a syllabus and counts.
 *
 * Same problem as `attachInstructors`, same fix. `?populate=lessons` returns nothing to a
 * visitor because no application role holds `api::lesson.lesson.find`, and the content API
 * drops relations whose target the caller cannot read. Opening that permission would make
 * `GET /api/lessons` public and hand out every lesson body with it.
 *
 * So the syllabus is assembled server-side and projected down to the fields a table of
 * contents needs. `body` and `videoUrl` are never selected, so the content cannot leak
 * through this path even by accident: it is not in the query.
 */
const attachSyllabus = async (
  strapi: Core.Strapi,
  response: { data?: unknown },
  { includeLessons }: { includeLessons: boolean }
): Promise<{ data?: unknown }> => {
  if (!response || typeof response !== 'object' || !response.data) return response;

  const isList = Array.isArray(response.data);
  const entries = (isList ? response.data : [response.data]) as { documentId?: string }[];
  const documentIds = entries.map((entry) => entry?.documentId).filter(Boolean) as string[];

  if (documentIds.length === 0) return response;

  const courses = await strapi.db.query('api::course.course').findMany({
    where: { documentId: { $in: documentIds } },
    select: ['id', 'documentId'],
  });

  const courseIds = courses.map((course: { id: number }) => course.id);

  const [lessons, quizzes] = await Promise.all([
    strapi.db.query('api::lesson.lesson').findMany({
      where: { course: { id: { $in: courseIds } } },
      // Note the absence of `body` and `videoUrl`.
      select: ['id', 'documentId', 'title', 'order', 'contentType'],
      populate: { course: { select: ['documentId'] } },
      orderBy: { order: 'asc' },
    }),
    strapi.db.query('api::quiz.quiz').findMany({
      where: { course: { id: { $in: courseIds } } },
      select: ['id', 'documentId', 'title', 'description', 'passingScore'],
      populate: { course: { select: ['documentId'] }, questions: { select: ['id'] } },
    }),
  ]);

  const lessonsByCourse = new Map<string, unknown[]>();
  const quizzesByCourse = new Map<string, unknown[]>();

  for (const lesson of lessons as ({ course?: { documentId?: string } } & Record<string, unknown>)[]) {
    const key = lesson.course?.documentId;
    if (!key) continue;
    const { course, ...rest } = lesson;
    void course;
    if (!lessonsByCourse.has(key)) lessonsByCourse.set(key, []);
    lessonsByCourse.get(key)!.push(rest);
  }

  for (const quiz of quizzes as ({ course?: { documentId?: string }; questions?: unknown[] } & Record<string, unknown>)[]) {
    const key = quiz.course?.documentId;
    if (!key) continue;
    const { course, questions, ...rest } = quiz;
    void course;
    if (!quizzesByCourse.has(key)) quizzesByCourse.set(key, []);
    quizzesByCourse.get(key)!.push({
      ...rest,
      questionCount: Array.isArray(questions) ? questions.length : 0,
    });
  }

  const decorate = (entry: { documentId?: string }) => {
    if (!entry?.documentId) return entry;

    const courseLessons = lessonsByCourse.get(entry.documentId) ?? [];
    const courseQuizzes = quizzesByCourse.get(entry.documentId) ?? [];

    return {
      ...entry,
      // The catalog only needs counts; the detail page needs the list itself.
      lessonCount: courseLessons.length,
      quizCount: courseQuizzes.length,
      ...(includeLessons ? { lessons: courseLessons, quizzes: courseQuizzes } : {}),
    };
  };

  return {
    ...response,
    data: isList ? entries.map(decorate) : decorate(entries[0]),
  };
};

export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  /**
   * Catalog listing.
   *
   * Unpublished courses are invisible to everyone except the people who can manage them.
   * The filter is merged into `ctx.query` *before* delegating to the core controller, so a
   * client cannot undo it by sending `?filters[isPublished]=false` — their filter is
   * overwritten, not merged into.
   */
  async find(ctx) {
    const user = ctx.state.user as AuthUser | undefined;

    if (!isStaff(user)) {
      ctx.query = {
        ...ctx.query,
        filters: { ...(ctx.query?.filters as object), isPublished: true },
      };
    }

    const response = await super.find(ctx);

    return attachSyllabus(strapi, await attachInstructors(strapi, sanitizeCourseResponse(response)), {
      includeLessons: false,
    });
  },

  async findOne(ctx) {
    const user = ctx.state.user as AuthUser | undefined;
    const course = await findCourseByDocumentId(strapi, ctx.params.id);

    if (!course) {
      return ctx.notFound('Course not found');
    }

    // A draft course behaves as if it does not exist for anyone who cannot manage it —
    // 404 rather than 403, so the existence of unpublished work is not disclosed.
    if (!course.isPublished && !canManageCourse(user, course)) {
      return ctx.notFound('Course not found');
    }

    const response = await super.findOne(ctx);

    return attachSyllabus(strapi, await attachInstructors(strapi, sanitizeCourseResponse(response)), {
      includeLessons: true,
    });
  },

  /**
   * Ownership is assigned by the server, never by the client.
   *
   * If `owner` were taken from the request body, an instructor could create a course
   * "owned" by somebody else and then edit it through the ownership check, or hand their
   * own course to a colleague to bypass a restriction. The body value is dropped and the
   * relation is written afterwards by `linkUserRelation` (see that function for why it
   * cannot go through the request body).
   */
  async create(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const data = { ...(body.data ?? {}) };

    delete data.owner;

    ctx.request.body = { ...body, data };

    const response = (await super.create(ctx)) as { data?: { documentId?: string } };
    const documentId = response?.data?.documentId;

    if (documentId) {
      await linkUserRelation(strapi, 'api::course.course', documentId, 'owner', user.id);
    }

    return attachInstructors(strapi, sanitizeCourseResponse(response));
  },

  /**
   * Reaching this point means `global::owns-course` already approved the caller for this
   * course. What is still open is *re-assignment*: only an admin may move a course to a
   * different owner, otherwise an instructor could give away a course and lose the
   * platform's record of who is responsible for it.
   */
  async update(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const data = { ...(body.data ?? {}) };

    const requestedOwner = canManageAllCourses(user) ? readRelationInput(data.owner) : null;

    // Always stripped from the body — the content API would reject the relation anyway.
    delete data.owner;

    ctx.request.body = { ...body, data };

    const response = (await super.update(ctx)) as { data?: { documentId?: string } };

    if (requestedOwner !== null && response?.data?.documentId) {
      const nextOwner = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: /^\d+$/.test(String(requestedOwner))
          ? { id: Number(requestedOwner) }
          : { documentId: String(requestedOwner) },
      });

      if (nextOwner) {
        await linkUserRelation(strapi, 'api::course.course', response.data.documentId, 'owner', nextOwner.id);
      }
    }

    return attachInstructors(strapi, sanitizeCourseResponse(response));
  },

  /**
   * GET /api/courses/slug/:slug
   *
   * The course detail page addresses courses by slug, not documentId. Without this the
   * page would have to run a filtered list query to translate the slug, then a second
   * request for the record itself, on every visit.
   *
   * It reuses `findOne` rather than duplicating its logic, so the unpublished-course check
   * and the sanitising both still apply.
   */
  async bySlug(ctx, next) {
    const course = await strapi.db.query('api::course.course').findOne({
      where: { slug: ctx.params.slug },
      select: ['documentId'],
    });

    if (!course) {
      return ctx.notFound('Course not found');
    }

    ctx.params = { ...ctx.params, id: course.documentId };

    // Strapi types every controller action as optional, hence the assertion. `next` is
    // forwarded so the action keeps the same signature the router expects.
    return this.findOne!(ctx, next);
  },

  /**
   * GET /api/courses/:id/my-progress
   *
   * The student's own numbers for one course. Students may only ever ask about themselves,
   * so there is no `studentId` parameter to tamper with — the identity comes from the JWT.
   */
  async myProgress(ctx) {
    const user = ctx.state.user as AuthUser;
    const course = await findCourseByDocumentId(strapi, ctx.params.id);

    if (!course) {
      return ctx.notFound('Course not found');
    }

    if (isStudent(user) && !(await isEnrolled(strapi, user.id, course.id))) {
      return ctx.forbidden('You are not enrolled in this course');
    }

    const progress = await computeCourseProgress(strapi, user.id, course.id);

    return {
      data: {
        course: { id: course.id, documentId: course.documentId, title: course.title },
        ...progress,
      },
    };
  },

  /**
   * GET /api/courses/:id/students-progress
   *
   * The "View student progress" row of the permission matrix, staff side. The route policy
   * has already established that the caller may manage this course; an instructor asking
   * about a course they do not own never gets here.
   */
  async studentsProgress(ctx) {
    const user = ctx.state.user as AuthUser;
    const course = await findCourseByDocumentId(strapi, ctx.params.id);

    if (!course) {
      return ctx.notFound('Course not found');
    }

    if (!canManageCourse(user, course)) {
      return ctx.forbidden('You cannot view progress for this course');
    }

    const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { course: { id: course.id } },
      populate: { student: true },
      orderBy: { enrolledAt: 'asc' },
    });

    const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { course: { id: course.id } },
      populate: { student: true, quiz: true },
      orderBy: { submittedAt: 'desc' },
    });

    const rows = await Promise.all(
      enrollments.map(async (enrollment: { student?: { id: number; username: string; email: string } | null; enrolledAt: string }) => {
        const student = enrollment.student;

        if (!student) return null;

        const progress = await computeCourseProgress(strapi, student.id, course.id);

        const bestAttempt = attempts
          .filter((attempt: { student?: { id: number } | null }) => attempt.student?.id === student.id)
          .reduce(
            (best: { score: number } | null, attempt: { score: number }) =>
              !best || attempt.score > best.score ? attempt : best,
            null
          );

        return {
          student: { id: student.id, username: student.username, email: student.email },
          enrolledAt: enrollment.enrolledAt,
          completed: progress.completed,
          total: progress.total,
          percentage: progress.percentage,
          bestQuizScore: bestAttempt ? bestAttempt.score : null,
        };
      })
    );

    return {
      data: {
        course: { id: course.id, documentId: course.documentId, title: course.title },
        students: rows.filter(Boolean),
      },
    };
  },

  /**
   * GET /api/courses/mine
   *
   * The authoring side of "My Courses": what this instructor owns, or the whole library
   * for an admin / content manager.
   */
  async mine(ctx) {
    const user = ctx.state.user as AuthUser;

    const where = isInstructor(user) ? { owner: { id: user.id } } : {};

    const courses = await strapi.db.query('api::course.course').findMany({
      where,
      populate: { owner: true, lessons: true, quizzes: true, enrollments: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: courses.map(
        (course: {
          id: number;
          documentId: string;
          title: string;
          slug: string;
          level: string;
          isPublished: boolean;
          description?: string;
          coverImageUrl?: string;
          owner?: { id: number; username: string } | null;
          lessons?: unknown[];
          quizzes?: unknown[];
          enrollments?: unknown[];
        }) => ({
          id: course.id,
          documentId: course.documentId,
          title: course.title,
          slug: course.slug,
          level: course.level,
          isPublished: course.isPublished,
          description: course.description ?? null,
          coverImageUrl: course.coverImageUrl ?? null,
          owner: course.owner ? { id: course.owner.id, username: course.owner.username } : null,
          lessonCount: course.lessons?.length ?? 0,
          quizCount: course.quizzes?.length ?? 0,
          enrollmentCount: course.enrollments?.length ?? 0,
        })
      ),
    };
  },
}));
