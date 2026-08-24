/**
 * Quiz auto-grading.
 *
 * This is a pure function on purpose: no database, no `ctx`, no Strapi. Grading a quiz is
 * "compare two lists" and nothing else, so it can be reasoned about (and explained) on its
 * own, and the controller around it only has to worry about loading rows and saving the
 * result.
 *
 * The client never sends a score — it sends which option it picked, and the server decides.
 * `correctIndex` never leaves the server for a student, so a submission cannot be forged by
 * reading the network response of the "take quiz" request.
 */

export type QuestionRecord = {
  id: number;
  documentId: string;
  prompt?: string;
  options?: unknown;
  correctIndex: number;
  order?: number;
};

export type SubmittedAnswer = {
  questionId: string | number;
  selectedIndex: number;
};

export type GradedQuestion = {
  questionId: string;
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
};

export type GradeResult = {
  correctCount: number;
  totalQuestions: number;
  /** Percentage, rounded to a whole number. 0 when the quiz has no questions. */
  score: number;
  passed: boolean;
  breakdown: GradedQuestion[];
  /** Normalised answers, safe to persist on the attempt. */
  normalizedAnswers: { questionId: string; selectedIndex: number | null }[];
};

const optionCount = (options: unknown): number => (Array.isArray(options) ? options.length : 0);

/**
 * Builds `questionId -> selectedIndex`, accepting either the documentId or the numeric id
 * as the key so a client that kept ids from an older response still grades correctly.
 * The first answer for a question wins; later duplicates are ignored, which keeps grading
 * deterministic no matter what order a client sends.
 */
const indexAnswers = (answers: SubmittedAnswer[]): Map<string, number> => {
  const byQuestion = new Map<string, number>();

  for (const answer of answers ?? []) {
    if (!answer || answer.questionId === undefined || answer.questionId === null) continue;

    const key = String(answer.questionId);
    if (byQuestion.has(key)) continue;

    if (!Number.isInteger(answer.selectedIndex)) continue;

    byQuestion.set(key, answer.selectedIndex);
  }

  return byQuestion;
};

export const gradeAttempt = (
  questions: QuestionRecord[],
  answers: SubmittedAnswer[],
  passingScore: number
): GradeResult => {
  const submitted = indexAnswers(answers);
  const breakdown: GradedQuestion[] = [];
  const normalizedAnswers: GradeResult['normalizedAnswers'] = [];

  let correctCount = 0;

  for (const question of questions ?? []) {
    // Look the answer up by documentId first, then by numeric id.
    const rawSelection =
      submitted.get(question.documentId) ?? submitted.get(String(question.id)) ?? null;

    // An index outside the option list is treated as "not answered" rather than an error:
    // a half-finished quiz should still grade, it should just score zero for that question.
    const total = optionCount(question.options);
    const selectedIndex =
      rawSelection !== null && rawSelection >= 0 && rawSelection < total ? rawSelection : null;

    const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex;

    if (isCorrect) {
      correctCount += 1;
    }

    breakdown.push({
      questionId: question.documentId,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
    });

    normalizedAnswers.push({ questionId: question.documentId, selectedIndex });
  }

  const totalQuestions = breakdown.length;

  // An empty quiz scores 0 instead of dividing by zero.
  const score = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

  return {
    correctCount,
    totalQuestions,
    score,
    passed: totalQuestions > 0 && score >= passingScore,
    breakdown,
    normalizedAnswers,
  };
};
