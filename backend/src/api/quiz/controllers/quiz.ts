import { factories } from '@strapi/strapi';
import { canManageCourse, isInstructor, isStudent, type AuthUser } from '../../../utils/permissions';
import {
  findCourseByAnyId,
  findCourseByQuizDocumentId,
  findOwnedCourseIds,
  withScope,
  isEnrolled,
  readRelationInput,
} from '../../../utils/resolve';
import { toStudentQuiz } from '../../../utils/sanitize';
import { gradeAttempt, type SubmittedAnswer } from '../../../utils/grading';
import { notify } from '../../../utils/notify';
import { denyIfCourseRestricted } from '../../../utils/access';
import { getAttemptStatus, checkAttemptLimit } from '../../../utils/attempts';
import { issueCertificateIfEarned } from '../../../utils/certificates';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  /**
   * The core quiz endpoints are staff-only because a populated quiz carries its questions,
   * and questions carry `correctIndex`. Students never touch these — they use
   * `/quizzes/:id/take`, which strips the answer key.
   */
  async find(ctx) {
    const user = ctx.state.user as AuthUser;

    if (isInstructor(user)) {
      // See the note in the lesson controller: filtering through `course.owner` is a 400.
      const ownedCourseIds = await findOwnedCourseIds(strapi, user.id);

      if (ownedCourseIds.length === 0) {
        return { data: [], meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } };
      }

      ctx.query = {
        ...ctx.query,
        filters: withScope(ctx.query?.filters, { course: { id: { $in: ownedCourseIds } } }),
      };
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    const user = ctx.state.user as AuthUser;
    const course = await findCourseByQuizDocumentId(strapi, ctx.params.id);

    if (!course) {
      return ctx.notFound('Quiz not found');
    }

    if (!canManageCourse(user, course)) {
      return ctx.forbidden('You cannot view this quiz');
    }

    return super.findOne(ctx);
  },

  async create(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const course = await findCourseByAnyId(strapi, readRelationInput(body.data?.course));

    if (!course) {
      return ctx.badRequest('A valid `course` relation is required to create a quiz');
    }

    if (!canManageCourse(user, course)) {
      return ctx.forbidden('You cannot add a quiz to this course');
    }

    return super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user as AuthUser;

    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    const requestedCourse = readRelationInput(body.data?.course);

    if (requestedCourse !== null) {
      const destination = await findCourseByAnyId(strapi, requestedCourse);

      if (!destination || !canManageCourse(user, destination)) {
        return ctx.forbidden('You cannot move this quiz into that course');
      }
    }

    return super.update(ctx);
  },

  /**
   * GET /api/quizzes/:id/take
   *
   * The student-facing view of a quiz. Every question goes through `stripAnswerKey`, so
   * the response physically cannot contain `correctIndex` — there is nothing to read out
   * of the network tab and nothing to guess from.
   *
   * Staff can call it too, to preview what a student will see.
   */
  async take(ctx) {
    const user = ctx.state.user as AuthUser;

    const quiz = await strapi.db.query('api::quiz.quiz').findOne({
      where: { documentId: ctx.params.id },
      populate: { questions: true, course: { populate: { owner: true } } },
    });

    if (!quiz) {
      return ctx.notFound('Quiz not found');
    }

    if (isStudent(user)) {
      if (!quiz.course || !(await isEnrolled(strapi, user.id, quiz.course.id))) {
        return ctx.forbidden('You must be enrolled in this course to take its quiz');
      }
    } else if (!canManageCourse(user, quiz.course)) {
      return ctx.forbidden('You cannot view this quiz');
    }

    // The student needs to know where they stand before they start, not after the server
    // refuses their submission. Staff get the same shape with a null status, because they
    // are previewing rather than sitting it.
    const attemptStatus = isStudent(user)
      ? await getAttemptStatus(strapi, user.id, quiz)
      : null;

    return { data: { ...toStudentQuiz(quiz), attemptStatus } };
  },

  /**
   * POST /api/quizzes/:id/submit   body: { answers: [{ questionId, selectedIndex }] }
   *
   * Auto-grading. The flow is deliberately one-directional:
   *   1. load the questions (with answers) from the database — never from the request
   *   2. grade with the pure `gradeAttempt` function
   *   3. persist the attempt
   *   4. return the score plus a per-question breakdown
   *
   * The client supplies only which option it picked. A forged `score` in the body is
   * ignored because the body is never read for anything except `answers`.
   */
  async submit(ctx) {
    const user = ctx.state.user as AuthUser;

    // Checked before the quiz is even loaded: a restricted student may still read the
    // course, but a submitted attempt is a graded record and must not be created.
    if (denyIfCourseRestricted(ctx)) return;

    const quiz = await strapi.db.query('api::quiz.quiz').findOne({
      where: { documentId: ctx.params.id },
      populate: { questions: true, course: true },
    });

    if (!quiz) {
      return ctx.notFound('Quiz not found');
    }

    if (!quiz.course) {
      return ctx.badRequest('This quiz is not attached to a course');
    }

    if (!(await isEnrolled(strapi, user.id, quiz.course.id))) {
      return ctx.forbidden('You must be enrolled in this course to take its quiz');
    }

    /**
     * Attempt limits.
     *
     * Without this a student can resubmit until they guess their way to a pass, which makes
     * the stored score a record of persistence rather than of knowledge. The check has to
     * live here rather than in the UI for the obvious reason: the endpoint is callable
     * directly, and a limit enforced by a disabled button is not a limit.
     *
     * `maxAttempts: 0` means unlimited, so a practice quiz is still expressible. The
     * cooldown is separate and optional — a cap alone stops the tenth attempt, a cooldown
     * stops the second one from arriving four seconds after the first.
     */
    const limit = await checkAttemptLimit(strapi, user.id, quiz);

    if (!limit.allowed) {
      return ctx.forbidden(limit.reason);
    }

    const body = (ctx.request.body ?? {}) as {
      answers?: SubmittedAnswer[];
      data?: { answers?: SubmittedAnswer[] };
    };

    // Accept both `{ answers }` and Strapi's usual `{ data: { answers } }` envelope.
    const answers = body.answers ?? body.data?.answers;

    if (!Array.isArray(answers)) {
      return ctx.badRequest('`answers` must be an array of { questionId, selectedIndex }');
    }

    const questions = [...(quiz.questions ?? [])].sort(
      (a: { order?: number }, b: { order?: number }) => Number(a.order ?? 0) - Number(b.order ?? 0)
    );

    if (questions.length === 0) {
      return ctx.badRequest('This quiz has no questions yet');
    }

    const result = gradeAttempt(questions, answers, quiz.passingScore ?? 60);

    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').create({
      data: {
        student: user.id,
        quiz: quiz.id,
        course: quiz.course.id,
        answers: result.normalizedAnswers,
        correctCount: result.correctCount,
        totalQuestions: result.totalQuestions,
        score: result.score,
        passed: result.passed,
        submittedAt: new Date().toISOString(),
      },
    });

    // The other moment a certificate can be earned: the lessons were already finished and
    // this attempt supplied the pass the course was waiting on.
    const certificate = result.passed
      ? await issueCertificateIfEarned(strapi, user.id, quiz.course.id)
      : null;

    const courseRow = await strapi.db.query('api::course.course').findOne({
      where: { id: quiz.course.id },
      populate: { owner: true },
    });

    await notify(strapi, {
      recipientId: user.id,
      type: 'quiz-result',
      title: `You scored ${result.score}% on ${quiz.title}`,
      body: result.passed ? 'Passed.' : `Pass mark is ${quiz.passingScore}%.`,
      href: `/learn/${courseRow?.slug ?? ''}/quiz`,
    });

    await notify(strapi, {
      recipientId: courseRow?.owner?.id,
      actorId: user.id,
      type: 'quiz-submitted',
      title: `${user.username} scored ${result.score}% on ${quiz.title}`,
      href: `/studio`,
    });

    return {
      data: {
        attemptId: attempt.documentId,
        quiz: { documentId: quiz.documentId, title: quiz.title, passingScore: quiz.passingScore },
        correctCount: result.correctCount,
        totalQuestions: result.totalQuestions,
        score: result.score,
        passed: result.passed,
        // The breakdown is returned only *after* grading, so revealing the right answers
        // here costs nothing — the attempt is already recorded.
        breakdown: result.breakdown,
        // Non-null only on the attempt that completed the course.
        certificate,
        // Recomputed after this attempt, so the result screen can say how many tries are
        // left without asking again.
        attemptStatus: await getAttemptStatus(strapi, user.id, quiz),
      },
    };
  },
}));
