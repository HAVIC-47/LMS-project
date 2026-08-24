/**
 * Single source of truth for "who is allowed to do what".
 *
 * Policies, controllers and the bootstrap permission grid all import from here, so the
 * access rules exist in exactly one place. If a rule is wrong it is wrong once, and there
 * is one file to audit when someone asks "prove students cannot edit courses".
 */

export const ROLES = {
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content-manager',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

/** Shape of `ctx.state.user` once the users-permissions auth strategy has populated it. */
export type AuthUser = {
  id: number;
  documentId?: string;
  username?: string;
  email?: string;
  role?: { id: number; name: string; type: string } | null;
};

export const getRoleType = (user?: AuthUser | null): string | null => user?.role?.type ?? null;

export const isAdmin = (user?: AuthUser | null) => getRoleType(user) === ROLES.ADMIN;
export const isContentManager = (user?: AuthUser | null) =>
  getRoleType(user) === ROLES.CONTENT_MANAGER;
export const isInstructor = (user?: AuthUser | null) => getRoleType(user) === ROLES.INSTRUCTOR;
export const isStudent = (user?: AuthUser | null) => getRoleType(user) === ROLES.STUDENT;

/** Anyone who works on the content library rather than consuming it. */
export const isStaff = (user?: AuthUser | null) =>
  isAdmin(user) || isContentManager(user) || isInstructor(user);

/**
 * Admin and Content Manager operate across the whole platform ("any course" in the
 * permission matrix). Instructors are scoped to courses they own.
 */
export const canManageAllCourses = (user?: AuthUser | null) => isAdmin(user) || isContentManager(user);

type CourseLike = { owner?: { id?: number } | number | null } | null | undefined;

const ownerIdOf = (course: CourseLike): number | null => {
  if (!course || !course.owner) return null;
  return typeof course.owner === 'number' ? course.owner : (course.owner.id ?? null);
};

/**
 * The matrix rule for courses, lessons and quizzes in one predicate:
 *   Admin            -> any course
 *   Content Manager  -> any course
 *   Instructor       -> own courses only
 *   Student          -> never
 */
export const canManageCourse = (user: AuthUser | null | undefined, course: CourseLike): boolean => {
  if (!user) return false;
  if (canManageAllCourses(user)) return true;
  if (!isInstructor(user)) return false;

  const ownerId = ownerIdOf(course);
  return ownerId !== null && ownerId === user.id;
};

/**
 * "View student progress" row of the matrix. Students see only their own numbers; that
 * case is handled by the dedicated /my-progress route, so this covers the staff side.
 */
export const canViewCourseProgress = (user: AuthUser | null | undefined, course: CourseLike) =>
  canManageCourse(user, course);

/** Admin edits every post; Content Manager edits the ones they wrote. */
export const canManageBlogPost = (
  user: AuthUser | null | undefined,
  post: { author?: { id?: number } | number | null } | null | undefined
): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!isContentManager(user)) return false;

  const authorId =
    !post || !post.author ? null : typeof post.author === 'number' ? post.author : (post.author.id ?? null);

  return authorId !== null && authorId === user.id;
};

type QuestionLike = Record<string, unknown> & { correctIndex?: number };

/**
 * Removes the answer key. Every student-facing quiz response goes through this — if a new
 * endpoint forgets to call it, the answers leak, which is why quiz questions are their own
 * collection type rather than a component embedded in the quiz.
 */
export const stripAnswerKey = <T extends QuestionLike>(question: T): Omit<T, 'correctIndex'> => {
  const { correctIndex, ...safe } = question;
  return safe;
};

export const stripAnswerKeys = <T extends QuestionLike>(questions: T[]): Omit<T, 'correctIndex'>[] =>
  (questions ?? []).map(stripAnswerKey);
