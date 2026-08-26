import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';
import { canManageAllCourses, isInstructor, type AuthUser } from '../../../utils/permissions';

/**
 * One learner, across every course the caller is entitled to see them in.
 *
 * The scoping is the whole design of this endpoint. The permission matrix reads
 * "View student progress — Admin ✅, Content Manager ✅, Instructor: own courses",
 * so an instructor gets this student's record **filtered to the instructor's own courses**
 * rather than a 403. That is the honest reading: they may see this student's work on their
 * own material, and none of their work elsewhere.
 *
 * The filter is applied to the query, not to the response. Fetching everything and hiding
 * the surplus on the way out is the version that leaks the first time somebody adds a
 * field and forgets the filter.
 *
 * Note the answer key is present, as it is on `/courses/:id/insights` — same audience, and
 * the point of the screen is to show what the right answer was. It only ever covers quizzes
 * belonging to courses already in scope.
 */

const USER = 'plugin::users-permissions.user';

type LessonRow = { id: number; documentId: string; title: string; order: number };

type QuestionRow = {
  documentId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  order: number;
};

const percentage = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /api/learners/:id
   *
   * `:id` is the numeric user id, which is what the cohort table already holds. A
   * documentId would be equally workable; the numeric id is what the enrollment and
   * progress relations are keyed on, so it avoids a lookup on every join below.
   */
  async show(ctx: Context) {
    const viewer = ctx.state.user as AuthUser;
    const studentId = Number(ctx.params.id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return ctx.badRequest('A numeric student id is required');
    }

    const student = await strapi.db.query(USER).findOne({
      where: { id: studentId },
      populate: { role: true },
    });

    if (!student) return ctx.notFound('No such student');

    // ---- which courses may this caller see this student in? ----------------------------
    const ownScope = isInstructor(viewer) && !canManageAllCourses(viewer);

    const visibleCourses = await strapi.db.query('api::course.course').findMany({
      where: ownScope ? { owner: { id: viewer.id } } : {},
      select: ['id', 'documentId', 'title', 'slug', 'level', 'coverImageUrl', 'isPublished'],
    });

    const courseIds = visibleCourses.map((course: { id: number }) => course.id);

    if (courseIds.length === 0) {
      return ctx.forbidden('You do not manage any course this student could be enrolled in');
    }

    const courseById = new Map(
      (visibleCourses as { id: number }[]).map((course) => [course.id, course])
    );

    // ---- everything about this student, inside that scope, in five queries --------------
    const [enrollments, lessons, completions, quizzes, attempts] = await Promise.all([
      strapi.db.query('api::enrollment.enrollment').findMany({
        where: { student: { id: studentId }, course: { id: { $in: courseIds } } },
        populate: { course: true },
        orderBy: { enrolledAt: 'desc' },
      }),
      strapi.db.query('api::lesson.lesson').findMany({
        where: { course: { id: { $in: courseIds } } },
        populate: { course: true },
        orderBy: { order: 'asc' },
      }),
      strapi.db.query('api::lesson-progress.lesson-progress').findMany({
        where: {
          student: { id: studentId },
          course: { id: { $in: courseIds } },
          completed: true,
        },
        populate: { lesson: true, course: true },
      }),
      strapi.db.query('api::quiz.quiz').findMany({
        where: { course: { id: { $in: courseIds } } },
        populate: { questions: true, course: true },
      }),
      strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
        where: { student: { id: studentId }, course: { id: { $in: courseIds } } },
        populate: { quiz: true, course: true },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    // ---- indexes -----------------------------------------------------------------------
    const lessonsByCourse = new Map<number, LessonRow[]>();

    for (const lesson of lessons as (LessonRow & { course?: { id: number } | null })[]) {
      const id = lesson.course?.id;
      if (typeof id !== 'number') continue;
      const list = lessonsByCourse.get(id) ?? [];
      list.push(lesson);
      lessonsByCourse.set(id, list);
    }

    /** Completion timestamps, so the lesson list can say *when* rather than only whether. */
    const completedAtByLesson = new Map<string, string>();

    for (const row of completions as {
      lesson?: { documentId: string } | null;
      completedAt: string | null;
      updatedAt: string;
    }[]) {
      const id = row.lesson?.documentId;
      if (!id) continue;
      completedAtByLesson.set(id, row.completedAt ?? row.updatedAt);
    }

    const questionsByDocumentId = new Map<string, QuestionRow>();
    const quizzesByCourse = new Map<number, { documentId: string; title: string; passingScore: number; questionCount: number }[]>();

    for (const quiz of quizzes as {
      documentId: string;
      title: string;
      passingScore: number;
      questions?: QuestionRow[];
      course?: { id: number } | null;
    }[]) {
      for (const question of quiz.questions ?? []) {
        questionsByDocumentId.set(question.documentId, question);
      }

      const courseId = quiz.course?.id;
      if (typeof courseId !== 'number') continue;

      const list = quizzesByCourse.get(courseId) ?? [];
      list.push({
        documentId: quiz.documentId,
        title: quiz.title,
        passingScore: quiz.passingScore,
        questionCount: (quiz.questions ?? []).length,
      });
      quizzesByCourse.set(courseId, list);
    }

    // ---- courses -----------------------------------------------------------------------
    const courses = (enrollments as {
      enrolledAt: string;
      course?: { id: number } | null;
    }[])
      .map((enrollment) => {
        const courseId = enrollment.course?.id;
        if (typeof courseId !== 'number') return null;

        const source = courseById.get(courseId) as
          | {
              documentId: string;
              title: string;
              slug: string;
              level: string;
              coverImageUrl: string | null;
              isPublished: boolean;
            }
          | undefined;

        if (!source) return null;

        const courseLessons = lessonsByCourse.get(courseId) ?? [];

        const lessonRows = courseLessons.map((lesson) => ({
          documentId: lesson.documentId,
          title: lesson.title,
          order: lesson.order,
          completed: completedAtByLesson.has(lesson.documentId),
          completedAt: completedAtByLesson.get(lesson.documentId) ?? null,
        }));

        const done = lessonRows.filter((lesson) => lesson.completed).length;

        return {
          documentId: source.documentId,
          title: source.title,
          slug: source.slug,
          level: source.level,
          coverImageUrl: source.coverImageUrl,
          isPublished: source.isPublished,
          enrolledAt: enrollment.enrolledAt,
          progress: {
            completed: done,
            total: lessonRows.length,
            percentage: percentage(done, lessonRows.length),
          },
          lessons: lessonRows,
          quizzes: quizzesByCourse.get(courseId) ?? [],
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    // ---- attempts ----------------------------------------------------------------------
    const attemptRows = (attempts as {
      documentId: string;
      score: number;
      correctCount: number;
      totalQuestions: number;
      passed: boolean;
      submittedAt: string;
      answers?: { questionId: string; selectedIndex: number | null }[] | null;
      quiz?: { documentId: string; title: string; passingScore: number } | null;
      course?: { id: number; documentId: string; title: string; slug: string } | null;
    }[]).map((attempt) => ({
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
        ? {
            documentId: attempt.course.documentId,
            title: attempt.course.title,
            slug: attempt.course.slug,
          }
        : null,
      answers: (attempt.answers ?? []).map((answer) => {
        const question = questionsByDocumentId.get(answer.questionId);

        return {
          questionId: answer.questionId,
          prompt: question?.prompt ?? 'This question has since been removed',
          options: question?.options ?? [],
          selectedIndex: answer.selectedIndex,
          correctIndex: question?.correctIndex ?? null,
          // A skipped question is not a wrong one. Collapsing null to false would score it
          // as an error and quietly overstate how much the student got wrong.
          correct:
            question && answer.selectedIndex !== null
              ? answer.selectedIndex === question.correctIndex
              : null,
        };
      }),
    }));

    const lessonsCompleted = courses.reduce((sum, course) => sum + course.progress.completed, 0);
    const lessonsTotal = courses.reduce((sum, course) => sum + course.progress.total, 0);

    return {
      data: {
        student: {
          id: student.id,
          username: student.username,
          displayName: student.displayName ?? null,
          avatarUrl: student.avatarUrl ?? null,
          email: student.email,
          role: student.role?.type ?? null,
          joinedAt: student.createdAt,
        },
        // True when an instructor is looking at a filtered view, so the page can say so
        // rather than implying this is everything the student has ever done.
        scoped: ownScope,
        courses,
        attempts: attemptRows,
        summary: {
          courses: courses.length,
          finished: courses.filter((course) => course.progress.percentage === 100).length,
          inProgress: courses.filter(
            (course) => course.progress.percentage > 0 && course.progress.percentage < 100
          ).length,
          notStarted: courses.filter((course) => course.progress.percentage === 0).length,
          lessonsCompleted,
          lessonsTotal,
          overallCompletion: percentage(lessonsCompleted, lessonsTotal),
          attempts: attemptRows.length,
          passed: attemptRows.filter((attempt) => attempt.passed).length,
          averageScore:
            attemptRows.length === 0
              ? 0
              : Math.round(
                  attemptRows.reduce((sum, attempt) => sum + attempt.score, 0) / attemptRows.length
                ),
          bestScore:
            attemptRows.length === 0
              ? null
              : Math.max(...attemptRows.map((attempt) => attempt.score)),
        },
      },
    };
  },
});
