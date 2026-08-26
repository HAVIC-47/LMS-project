import 'server-only';

import { strapiFetchOrNull } from '@/lib/strapi';
import type { CourseLevel, RoleType } from '@/lib/types';

/**
 * One learner's record, for the staff who may view their progress.
 *
 * `scoped` is the field worth noticing: when an instructor calls this, the backend filters
 * the record to courses that instructor owns and sets the flag. The page uses it to say so
 * out loud, because a partial record presented as a whole one is a quietly misleading
 * screen — an instructor could otherwise conclude a student has done nothing when they
 * have simply done it elsewhere.
 */

export type LearnerLesson = {
  documentId: string;
  title: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
};

export type LearnerCourse = {
  documentId: string;
  title: string;
  slug: string;
  level: CourseLevel;
  coverImageUrl: string | null;
  isPublished: boolean;
  enrolledAt: string;
  progress: { completed: number; total: number; percentage: number };
  lessons: LearnerLesson[];
  quizzes: {
    documentId: string;
    title: string;
    passingScore: number;
    questionCount: number;
  }[];
};

export type LearnerAnswer = {
  questionId: string;
  prompt: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number | null;
  correct: boolean | null;
};

export type LearnerAttempt = {
  documentId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  submittedAt: string;
  quiz: { documentId: string; title: string; passingScore: number } | null;
  course: { documentId: string; title: string; slug: string } | null;
  answers: LearnerAnswer[];
};

export type LearnerRecord = {
  student: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    email: string;
    role: RoleType | null;
    joinedAt: string;
  };
  /** True when the caller is an instructor seeing only their own courses. */
  scoped: boolean;
  courses: LearnerCourse[];
  attempts: LearnerAttempt[];
  summary: {
    courses: number;
    finished: number;
    inProgress: number;
    notStarted: number;
    lessonsCompleted: number;
    lessonsTotal: number;
    overallCompletion: number;
    attempts: number;
    passed: number;
    averageScore: number;
    bestScore: number | null;
  };
};

export async function getLearner(id: string | number): Promise<LearnerRecord | null> {
  const response = await strapiFetchOrNull<{ data: LearnerRecord }>(`/learners/${id}`);

  return response?.data ?? null;
}
