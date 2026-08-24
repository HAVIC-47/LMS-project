import { factories } from '@strapi/strapi';
import { canManageCourse, isStudent, type AuthUser } from '../../../utils/permissions';
import { findCourseByQuizDocumentId } from '../../../utils/resolve';

/**
 * Attempts are written by `POST /api/quizzes/:id/submit` and are read-only everywhere
 * else — nothing in the API lets a client set or edit a score.
 */
export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  /**
   * GET /api/quiz-attempts/me
   *
   * "The student's quiz result is stored and viewable later." Scoped to the caller, with
   * no student parameter to tamper with.
   */
  async me(ctx) {
    const user = ctx.state.user as AuthUser;

    const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { student: { id: user.id } },
      populate: { quiz: true, course: true },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      data: attempts.map(
        (attempt: {
          id: number;
          documentId: string;
          score: number;
          correctCount: number;
          totalQuestions: number;
          passed: boolean;
          submittedAt: string;
          quiz?: { documentId: string; title: string; passingScore: number } | null;
          course?: { documentId: string; title: string } | null;
        }) => ({
          id: attempt.id,
          documentId: attempt.documentId,
          score: attempt.score,
          correctCount: attempt.correctCount,
          totalQuestions: attempt.totalQuestions,
          passed: attempt.passed,
          submittedAt: attempt.submittedAt,
          quiz: attempt.quiz
            ? {
                documentId: attempt.quiz.documentId,
                title: attempt.quiz.title,
                passingScore: attempt.quiz.passingScore,
              }
            : null,
          course: attempt.course
            ? { documentId: attempt.course.documentId, title: attempt.course.title }
            : null,
        })
      ),
    };
  },

  /**
   * GET /api/quiz-attempts/quiz/:id
   *
   * Every attempt on one quiz, for the staff who own the course. This is the quiz half of
   * "view student progress"; the lesson half lives on /courses/:id/students-progress.
   */
  async forQuiz(ctx) {
    const user = ctx.state.user as AuthUser;

    if (isStudent(user)) {
      return ctx.forbidden('Students can only view their own attempts');
    }

    const course = await findCourseByQuizDocumentId(strapi, ctx.params.id);

    if (!course) {
      return ctx.notFound('Quiz not found');
    }

    if (!canManageCourse(user, course)) {
      return ctx.forbidden('You cannot view attempts for this quiz');
    }

    const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { quiz: { documentId: ctx.params.id } },
      populate: { student: true },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      data: attempts.map(
        (attempt: {
          documentId: string;
          score: number;
          correctCount: number;
          totalQuestions: number;
          passed: boolean;
          submittedAt: string;
          student?: { id: number; username: string; email: string } | null;
        }) => ({
          documentId: attempt.documentId,
          score: attempt.score,
          correctCount: attempt.correctCount,
          totalQuestions: attempt.totalQuestions,
          passed: attempt.passed,
          submittedAt: attempt.submittedAt,
          student: attempt.student
            ? {
                id: attempt.student.id,
                username: attempt.student.username,
                email: attempt.student.email,
              }
            : null,
        })
      ),
    };
  },
}));
