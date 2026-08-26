import type { Core } from '@strapi/strapi';
import type { ResolvedCourse } from '../../../utils/resolve';

/**
 * The staff read model for one course.
 *
 * Its own module because it is a query-shaping problem rather than a request-handling one:
 * the controller decides who may ask, this decides what the answer is. It also keeps the
 * course controller from growing a third responsibility on top of CRUD and progress.
 *
 * Everything is gathered in five queries regardless of how many students or quizzes there
 * are. Computing each student's progress with the existing per-student helper would be one
 * query each, which is the N+1 this exists to avoid — the page is meant to be scanned, and
 * a cohort of forty should not cost forty round trips.
 *
 * Note that the answer key **is** included, unlike every student-facing quiz read. That is
 * the point of the screen: an instructor looking at a wrong answer needs to see what the
 * right one was. What keeps it on the correct side of the line is the caller check in the
 * controller, not anything here.
 */

type LessonRow = { id: number; documentId: string; title: string; order: number };

type QuestionRow = {
  id: number;
  documentId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  order: number;
};

type QuizRow = {
  id: number;
  documentId: string;
  title: string;
  passingScore: number;
  questions?: QuestionRow[];
};

type AttemptRow = {
  documentId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  submittedAt: string;
  /** `questionId` is the question's **documentId**, which is what the grader stores. */
  answers?: { questionId: string; selectedIndex: number | null }[] | null;
  student?: { id: number } | null;
  quiz?: { documentId: string; title: string } | null;
};

type StudentRow = {
  enrolledAt: string;
  student?: {
    id: number;
    username: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
};

const average = (values: number[]) =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);

const percentage = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

export const buildCourseInsights = async (strapi: Core.Strapi, course: ResolvedCourse) => {
  const [lessons, quizzes, enrollments, attempts, completions] = await Promise.all([
    strapi.db.query('api::lesson.lesson').findMany({
      where: { course: { id: course.id } },
      select: ['id', 'documentId', 'title', 'order'],
      orderBy: { order: 'asc' },
    }),
    strapi.db.query('api::quiz.quiz').findMany({
      where: { course: { id: course.id } },
      populate: { questions: true },
      orderBy: { createdAt: 'asc' },
    }),
    strapi.db.query('api::enrollment.enrollment').findMany({
      where: { course: { id: course.id } },
      populate: { student: true },
      orderBy: { enrolledAt: 'asc' },
    }),
    strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { course: { id: course.id } },
      populate: { student: true, quiz: true },
      orderBy: { submittedAt: 'desc' },
    }),
    strapi.db.query('api::lesson-progress.lesson-progress').findMany({
      where: { course: { id: course.id }, completed: true },
      populate: { student: true, lesson: true },
    }),
  ]);

  const lessonRows = lessons as LessonRow[];
  const totalLessons = lessonRows.length;

  // Indexed by documentId, because that is the key the grader writes into an attempt's
  // `answers`. Indexing by the numeric `id` instead silently matches nothing and every
  // answer renders as "this question has since been removed".
  const questionsById = new Map<string, QuestionRow>();

  const quizRows = (quizzes as QuizRow[]).map((quiz) => {
    const questions = [...(quiz.questions ?? [])].sort((a, b) => a.order - b.order);
    for (const question of questions) questionsById.set(question.documentId, question);
    return { ...quiz, questions };
  });

  // ---- completions, grouped two ways in one pass ---------------------------------------
  const completedByStudent = new Map<number, Set<string>>();
  const completionsByLesson = new Map<string, number>();

  for (const row of completions as {
    student?: { id: number } | null;
    lesson?: { documentId: string } | null;
  }[]) {
    const studentId = row.student?.id;
    const lessonId = row.lesson?.documentId;
    if (!studentId || !lessonId) continue;

    const set = completedByStudent.get(studentId) ?? new Set<string>();
    set.add(lessonId);
    completedByStudent.set(studentId, set);

    completionsByLesson.set(lessonId, (completionsByLesson.get(lessonId) ?? 0) + 1);
  }

  // ---- attempts, grouped by student -----------------------------------------------------
  const attemptsByStudent = new Map<number, AttemptRow[]>();

  for (const attempt of attempts as AttemptRow[]) {
    const studentId = attempt.student?.id;
    if (!studentId) continue;

    const list = attemptsByStudent.get(studentId) ?? [];
    list.push(attempt);
    attemptsByStudent.set(studentId, list);
  }

  /**
   * Joins a stored answer back to its question, so the screen can show the marking rather
   * than only the score. A question deleted after the attempt was taken still has an
   * answer on file, which is why the question is looked up rather than assumed.
   */
  const expandAnswers = (attempt: AttemptRow) =>
    (attempt.answers ?? []).map((answer) => {
      const question = questionsById.get(answer.questionId);

      return {
        questionId: answer.questionId,
        prompt: question?.prompt ?? 'This question has since been removed',
        options: question?.options ?? [],
        selectedIndex: answer.selectedIndex,
        correctIndex: question?.correctIndex ?? null,
        // A skipped question has `selectedIndex: null`. That is not a wrong answer and
        // must not be scored as one, so it stays null rather than collapsing to false.
        correct:
          question && answer.selectedIndex !== null
            ? answer.selectedIndex === question.correctIndex
            : null,
      };
    });

  const students = (enrollments as StudentRow[])
    .map((enrollment) => {
      const student = enrollment.student;
      if (!student) return null;

      const completedIds = [...(completedByStudent.get(student.id) ?? new Set<string>())];

      const studentAttempts = (attemptsByStudent.get(student.id) ?? []).map((attempt) => ({
        documentId: attempt.documentId,
        quizDocumentId: attempt.quiz?.documentId ?? null,
        quizTitle: attempt.quiz?.title ?? 'Removed quiz',
        score: attempt.score,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
        answers: expandAnswers(attempt),
      }));

      return {
        id: student.id,
        username: student.username,
        displayName: student.displayName ?? null,
        avatarUrl: student.avatarUrl ?? null,
        // Staff who can already read this student's answers can read their address.
        email: student.email,
        enrolledAt: enrollment.enrolledAt,
        progress: {
          completed: completedIds.length,
          total: totalLessons,
          percentage: percentage(completedIds.length, totalLessons),
        },
        completedLessonIds: completedIds,
        attempts: studentAttempts,
        bestScore: studentAttempts.length
          ? Math.max(...studentAttempts.map((attempt) => attempt.score))
          : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const allAttempts = students.flatMap((student) => student.attempts);

  return {
    course: {
      documentId: course.documentId,
      title: course.title,
      slug: course.slug,
      isPublished: course.isPublished,
    },

    lessons: lessonRows.map((lesson) => ({
      documentId: lesson.documentId,
      title: lesson.title,
      order: lesson.order,
      completedCount: completionsByLesson.get(lesson.documentId) ?? 0,
    })),

    quizzes: quizRows.map((quiz) => {
      const forQuiz = allAttempts.filter(
        (attempt) => attempt.quizDocumentId === quiz.documentId
      );

      return {
        documentId: quiz.documentId,
        title: quiz.title,
        passingScore: quiz.passingScore,
        questionCount: quiz.questions.length,
        questions: quiz.questions.map((question) => ({
          documentId: question.documentId,
          prompt: question.prompt,
          options: question.options,
          correctIndex: question.correctIndex,
          order: question.order,
        })),
        attemptCount: forQuiz.length,
        averageScore: average(forQuiz.map((attempt) => attempt.score)),
        passRate: percentage(forQuiz.filter((attempt) => attempt.passed).length, forQuiz.length),
      };
    }),

    students,

    summary: {
      students: students.length,
      lessons: totalLessons,
      averageCompletion: average(students.map((student) => student.progress.percentage)),
      finished: students.filter((student) => student.progress.percentage === 100).length,
      started: students.filter(
        (student) => student.progress.percentage > 0 && student.progress.percentage < 100
      ).length,
      notStarted: students.filter((student) => student.progress.percentage === 0).length,
      attempts: allAttempts.length,
      averageScore: average(allAttempts.map((attempt) => attempt.score)),
      passRate: percentage(allAttempts.filter((attempt) => attempt.passed).length, allAttempts.length),
    },
  };
};
