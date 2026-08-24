/**
 * Domain types mirroring the Strapi content types.
 *
 * These are hand-written rather than generated: the backend returns hand-shaped
 * projections from the custom endpoints (`/enrollments/me`, `/courses/mine`,
 * `/platform/stats`), so a generated schema type would describe the database, not the
 * responses the frontend actually receives.
 */

export const ROLES = {
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content-manager',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleType, string> = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.CONTENT_MANAGER]: 'Content Manager',
  [ROLES.INSTRUCTOR]: 'Instructor',
  [ROLES.STUDENT]: 'Student',
};

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  role: RoleType | null;
};

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export type LessonSummary = {
  id: number;
  documentId: string;
  title: string;
  order: number;
  contentType: 'text' | 'video';
  /** The course endpoints report whether a lesson has content without revealing it. */
  hasContent?: boolean;
};

export type Lesson = LessonSummary & {
  body: string | null;
  videoUrl: string | null;
};

export type QuizSummary = {
  id: number;
  documentId: string;
  title: string;
  description: string | null;
  passingScore: number;
  questionCount?: number;
};

export type CourseAuthor = {
  id: number;
  username: string;
};

export type Course = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  level: CourseLevel;
  isPublished: boolean;
  /**
   * The backend projects the course owner down to `{ id, username }` under this name.
   * It is not a populated relation: no application role can read the user collection, so
   * `?populate=owner` would come back empty. Same story for `lessons` and `quizzes`.
   */
  instructor?: CourseAuthor | null;
  lessonCount?: number;
  quizCount?: number;
  lessons?: LessonSummary[];
  quizzes?: QuizSummary[];
};

export type CourseProgress = {
  courseId: number;
  completed: number;
  total: number;
  percentage: number;
  completedLessonIds: string[];
};

export type Enrollment = {
  id: number;
  documentId: string;
  enrolledAt: string;
  course: Course & { instructor: CourseAuthor | null };
  progress: Omit<CourseProgress, 'courseId'>;
};

export type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: CourseAuthor | null;
};

/** Strapi 5 wraps list responses in `{ data, meta }` and flattens attributes onto the entry. */
export type StrapiListResponse<T> = {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

export type StrapiSingleResponse<T> = {
  data: T;
};

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
