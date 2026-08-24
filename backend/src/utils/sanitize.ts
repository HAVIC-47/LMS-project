import { stripAnswerKeys } from './permissions';

/**
 * Response shaping for anything that is not the lesson/quiz endpoint itself.
 *
 * The rule enforced here: **course endpoints never return lesson bodies or quiz answers.**
 *
 * Without it, `GET /api/courses?populate=lessons` would hand the full text of every paid
 * lesson to an anonymous visitor, and `populate=quizzes.questions` would hand out the
 * answer key. Rather than trying to guess which populate combinations are dangerous, the
 * course endpoints return metadata only, and the actual content is read from
 * `GET /api/lessons/:id` and `GET /api/quizzes/:id/take`, which both run their own
 * enrollment checks.
 */

type LessonEntry = Record<string, unknown> & {
  body?: unknown;
  videoUrl?: unknown;
};

/** Keeps enough to render a table of contents, drops everything a student has to earn. */
export const toLessonSummary = (lesson: LessonEntry) => {
  if (!lesson || typeof lesson !== 'object') return lesson;

  const { body, videoUrl, ...summary } = lesson;

  return {
    ...summary,
    // Told the UI *that* there is a video without handing over the URL.
    hasContent: Boolean(body) || Boolean(videoUrl),
  };
};

type QuizEntry = Record<string, unknown> & {
  questions?: Record<string, unknown>[];
};

export const toQuizSummary = (quiz: QuizEntry) => {
  if (!quiz || typeof quiz !== 'object') return quiz;

  const { questions, ...summary } = quiz;

  return {
    ...summary,
    questionCount: Array.isArray(questions) ? questions.length : undefined,
  };
};

type CourseEntry = Record<string, unknown> & {
  lessons?: LessonEntry[];
  quizzes?: QuizEntry[];
};

export const sanitizeCourseEntry = (course: CourseEntry) => {
  if (!course || typeof course !== 'object') return course;

  const sanitized: CourseEntry = { ...course };

  if (Array.isArray(sanitized.lessons)) {
    sanitized.lessons = sanitized.lessons
      .map(toLessonSummary)
      .sort((a, b) => Number((a as { order?: number }).order ?? 0) - Number((b as { order?: number }).order ?? 0));
  }

  if (Array.isArray(sanitized.quizzes)) {
    sanitized.quizzes = sanitized.quizzes.map(toQuizSummary);
  }

  return sanitized;
};

export const sanitizeCourseResponse = <T extends { data?: unknown }>(response: T): T => {
  if (!response || typeof response !== 'object') return response;

  const { data } = response;

  if (Array.isArray(data)) {
    return { ...response, data: data.map((entry) => sanitizeCourseEntry(entry as CourseEntry)) };
  }

  if (data && typeof data === 'object') {
    return { ...response, data: sanitizeCourseEntry(data as CourseEntry) };
  }

  return response;
};

/** Quiz shaped for a student who is about to take it: questions in order, no answer key. */
export const toStudentQuiz = (quiz: {
  id: number;
  documentId: string;
  title: string;
  description?: string | null;
  passingScore: number;
  questions?: (Record<string, unknown> & { correctIndex?: number; order?: number })[];
  course?: { documentId?: string; title?: string } | null;
}) => ({
  id: quiz.id,
  documentId: quiz.documentId,
  title: quiz.title,
  description: quiz.description ?? null,
  passingScore: quiz.passingScore,
  course: quiz.course ? { documentId: quiz.course.documentId, title: quiz.course.title } : null,
  questions: stripAnswerKeys(
    [...(quiz.questions ?? [])].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
  ),
});
