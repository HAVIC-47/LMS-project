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
  /**
   * Profile fields ride along with the session because the header draws the avatar on
   * every page. Nullable because an account that has never visited the settings screen
   * has none of them.
   */
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
};

export type ProfileCourse = {
  documentId: string;
  title: string;
  slug: string;
  description: string | null;
  level: CourseLevel;
  coverImageUrl: string | null;
  isPublished: boolean;
  lessonCount: number;
};

export type ProfilePost = {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  isPublished: boolean;
};

/**
 * A public profile.
 *
 * `isSelf` is decided by the backend from the token, never by comparing usernames here —
 * the client has no business being the authority on who you are. Anything the backend
 * withholds from a visitor arrives as `null` or as a zero count, so this type is the same
 * whether you are looking at your own profile or somebody else's.
 */
export type Profile = {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  role: RoleType | null;
  roleName: string | null;
  joinedAt: string;
  isSelf: boolean;
  /** Only ever populated for the account holder. */
  email: string | null;
  teaching: {
    publishedCourses: number;
    totalCourses: number;
    lessons: number;
    quizzes: number;
    students: number;
    courses: ProfileCourse[];
  };
  writing: {
    publishedPosts: number;
    totalPosts: number;
    draftPosts: number;
    posts: ProfilePost[];
  };
  /** Self only: nobody else needs to know how far along someone is. */
  learning: {
    enrolledCourses: number;
    lessonsCompleted: number;
    quizzesTaken: number;
    quizzesPassed: number;
  } | null;
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
