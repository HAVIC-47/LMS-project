import { factories } from '@strapi/strapi';
import { canManageCourse, isInstructor, type AuthUser } from '../../../utils/permissions';
import { findCourseByQuestionDocumentId, findQuizByAnyId, readRelationInput } from '../../../utils/resolve';

/**
 * Questions hold the answer key, so every route on this content type is staff-only and
 * scoped by course ownership. Students never read questions from here — they get the
 * stripped copy from `GET /api/quizzes/:id/take`.
 */
export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user as AuthUser;

    if (isInstructor(user)) {
      ctx.query = {
        ...ctx.query,
        filters: {
          ...(ctx.query?.filters as object),
          quiz: { course: { owner: { id: user.id } } },
        },
      };
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    const user = ctx.state.user as AuthUser;
    const course = await findCourseByQuestionDocumentId(strapi, ctx.params.id);

    if (!course) {
      return ctx.notFound('Question not found');
    }

    if (!canManageCourse(user, course)) {
      return ctx.forbidden('You cannot view this question');
    }

    return super.findOne(ctx);
  },

  async create(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const data = body.data ?? {};

    const quiz = await findQuizByAnyId(strapi, readRelationInput(data.quiz));

    if (!quiz) {
      return ctx.badRequest('A valid `quiz` relation is required to create a question');
    }

    if (!canManageCourse(user, quiz.course)) {
      return ctx.forbidden('You cannot add questions to this quiz');
    }

    const validationError = validateQuestionShape(data);

    if (validationError) {
      return ctx.badRequest(validationError);
    }

    return super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const data = body.data ?? {};

    const requestedQuiz = readRelationInput(data.quiz);

    if (requestedQuiz !== null) {
      const destination = await findQuizByAnyId(strapi, requestedQuiz);

      if (!destination || !canManageCourse(user, destination.course)) {
        return ctx.forbidden('You cannot move this question into that quiz');
      }
    }

    // On update the fields are optional, so only validate what was actually sent.
    if (data.options !== undefined || data.correctIndex !== undefined) {
      const existing = await strapi.db.query('api::question.question').findOne({
        where: { documentId: ctx.params.id },
      });

      const merged = {
        options: data.options ?? existing?.options,
        correctIndex: data.correctIndex ?? existing?.correctIndex,
      };

      const validationError = validateQuestionShape(merged);

      if (validationError) {
        return ctx.badRequest(validationError);
      }
    }

    return super.update(ctx);
  },
}));

/**
 * A question whose `correctIndex` points past the end of `options` can never be answered
 * correctly, and the student has no way to tell. Rejecting it at write time is much
 * cheaper than debugging a quiz that everybody fails.
 */
function validateQuestionShape(data: Record<string, unknown>): string | null {
  const { options, correctIndex } = data;

  if (!Array.isArray(options) || options.length < 2) {
    return '`options` must be an array of at least two choices';
  }

  if (options.some((option) => typeof option !== 'string' || option.trim() === '')) {
    return '`options` must contain non-empty strings';
  }

  if (!Number.isInteger(correctIndex) || (correctIndex as number) < 0 || (correctIndex as number) >= options.length) {
    return '`correctIndex` must be an index within `options`';
  }

  return null;
}
