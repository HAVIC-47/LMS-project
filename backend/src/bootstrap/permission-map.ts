import { ROLES, type RoleType } from '../utils/permissions';

/**
 * The permission matrix from the project spec, expressed as route permissions.
 *
 * This is enforcement layer 1: which role may *call* which endpoint. It is written in
 * source and applied on every boot rather than clicked into the Strapi admin UI, for two
 * reasons:
 *
 *   1. A fresh database (a Railway redeploy, a teammate cloning the repo) comes up with
 *      the same access rules. Nothing has to be remembered and re-checked by hand.
 *   2. It is reviewable. The matrix in the spec and the matrix in the code can be diffed.
 *
 * Layer 2 is the route policies (`global::has-role`, `global::owns-course`,
 * `global::is-enrolled`) and layer 3 is the ownership check inside each controller. This
 * layer answers "may an instructor call PUT /courses/:id at all"; the layers below answer
 * "may this instructor call it for *this* course".
 */

const COURSE = 'api::course.course';
const LESSON = 'api::lesson.lesson';
const QUIZ = 'api::quiz.quiz';
const QUESTION = 'api::question.question';
const ENROLLMENT = 'api::enrollment.enrollment';
const PROGRESS = 'api::lesson-progress.lesson-progress';
const ATTEMPT = 'api::quiz-attempt.quiz-attempt';
const BLOG = 'api::blog-post.blog-post';
const PLATFORM = 'api::platform.platform';

const CRUD = ['find', 'findOne', 'create', 'update', 'delete'];
const READ = ['find', 'findOne'];

const actions = (uid: string, names: string[]) => names.map((name) => `${uid}.${name}`);

/** Everything an admin can reach — the union of every other role plus the admin panel. */
const ADMIN_ACTIONS = [
  ...actions(COURSE, [...CRUD, 'mine', 'myProgress', 'studentsProgress']),
  ...actions(LESSON, CRUD),
  ...actions(QUIZ, [...CRUD, 'take']),
  ...actions(QUESTION, CRUD),
  ...actions(ENROLLMENT, CRUD),
  ...actions(PROGRESS, CRUD),
  ...actions(ATTEMPT, [...CRUD, 'forQuiz']),
  ...actions(BLOG, [...CRUD, 'mine', 'publish', 'unpublish']),
  ...actions(PLATFORM, ['stats', 'users', 'updateUserRole']),
];

/**
 * Content Manager: the whole content library, no user management.
 * Note the absence of every `api::platform.*` action — that is the "Manage users & assign
 * roles ❌" row, enforced rather than merely hidden.
 */
const CONTENT_MANAGER_ACTIONS = [
  ...actions(COURSE, [...CRUD, 'mine', 'studentsProgress']),
  ...actions(LESSON, CRUD),
  ...actions(QUIZ, [...CRUD, 'take']),
  ...actions(QUESTION, CRUD),
  ...actions(ATTEMPT, ['forQuiz']),
  ...actions(BLOG, [...CRUD, 'mine', 'publish', 'unpublish']),
];

/**
 * Instructor: same content verbs as a Content Manager, but every one of them is narrowed
 * to their own courses by `global::owns-course`. Blog is read-only — "Write / manage blog
 * posts ❌" — so no create/update/delete for BLOG here.
 */
const INSTRUCTOR_ACTIONS = [
  ...actions(COURSE, [...CRUD, 'mine', 'studentsProgress']),
  ...actions(LESSON, CRUD),
  ...actions(QUIZ, [...CRUD, 'take']),
  ...actions(QUESTION, CRUD),
  ...actions(ATTEMPT, ['forQuiz']),
  ...actions(BLOG, READ),
];

/**
 * Student: consume courses, never author them.
 * There is no `create`/`update`/`delete` on any content type, and the enrollment and
 * progress writes go through the scoped custom routes that take the user from the JWT.
 */
const STUDENT_ACTIONS = [
  ...actions(COURSE, [...READ, 'myProgress']),
  ...actions(LESSON, READ),
  ...actions(QUIZ, ['take', 'submit']),
  ...actions(ENROLLMENT, ['enroll', 'me', 'unenroll']),
  ...actions(PROGRESS, ['complete', 'uncomplete']),
  ...actions(ATTEMPT, ['me']),
  ...actions(BLOG, READ),
];

/**
 * Public (logged out): the marketing surface. Course catalog and published blog posts —
 * the blog controller pins anonymous callers to `status=published`, so drafts stay
 * invisible even to a hand-crafted query string.
 */
const PUBLIC_ACTIONS = [...actions(COURSE, READ), ...actions(BLOG, READ)];

export const PERMISSION_MAP: Record<RoleType | 'public', string[]> = {
  [ROLES.ADMIN]: ADMIN_ACTIONS,
  [ROLES.CONTENT_MANAGER]: CONTENT_MANAGER_ACTIONS,
  [ROLES.INSTRUCTOR]: INSTRUCTOR_ACTIONS,
  [ROLES.STUDENT]: STUDENT_ACTIONS,
  public: PUBLIC_ACTIONS,
};

/** Every signed-in role needs to be able to read its own profile. */
export const AUTHENTICATED_PLUGIN_ACTIONS = ['plugin::users-permissions.user.me'];

export const ROLE_DEFINITIONS: { type: RoleType; name: string; description: string }[] = [
  {
    type: ROLES.ADMIN,
    name: 'Admin',
    description: 'Full control of the platform. Manages users and assigns their roles.',
  },
  {
    type: ROLES.CONTENT_MANAGER,
    name: 'Content Manager',
    description: 'Creates and manages courses, lessons and the blog. Does not manage users.',
  },
  {
    type: ROLES.INSTRUCTOR,
    name: 'Instructor',
    description: 'Manages the lessons and quizzes of their own courses, and sees their students.',
  },
  {
    type: ROLES.STUDENT,
    name: 'Student',
    description: 'Enrolls in courses, views lessons, takes quizzes and tracks their progress.',
  },
];
