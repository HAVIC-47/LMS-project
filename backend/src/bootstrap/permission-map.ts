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
const COMMENT = 'api::comment.comment';
const POST_LIKE = 'api::post-like.post-like';
const NOTIFICATION = 'api::notification.notification';
const PROFILE = 'api::profile.profile';
const LEARNER = 'api::learner.learner';
const AUDIT = 'api::audit-log.audit-log';
const CERTIFICATE = 'api::certificate.certificate';
const REVIEW = 'api::review.review';

const CRUD = ['find', 'findOne', 'create', 'update', 'delete'];
const READ = ['find', 'findOne'];
/** Courses are also addressable by slug, which is a read like any other. */
const COURSE_READ = [...READ, 'bySlug'];

const actions = (uid: string, names: string[]) => names.map((name) => `${uid}.${name}`);

/**
 * Uploading an image.
 *
 * This used to be withheld from students, on the grounds that only authors need to put
 * files on the server. Avatars changed that: every account has a profile picture, so every
 * signed-in role needs it. The public role still does not — an anonymous upload endpoint
 * is a free file host.
 *
 * What keeps that acceptable is that the widening is only in *who*, not in *what*: the
 * frontend proxy validates the MIME type against an allowlist and caps the size before a
 * byte is forwarded, and `destroy` remains absent, so no one can delete anyone else's file
 * by guessing an id. Replacing an image points the record at a new file instead.
 */
export const UPLOAD_ACTIONS = ['plugin::upload.content-api.upload'];

/**
 * Discussion, notifications and profiles are the same for every signed-in role. A blog the
 * platform's own instructors cannot reply on is not a discussion, and every role has an
 * inbox, so these are shared rather than repeated four times.
 */
const PARTICIPATION_ACTIONS = [
  ...actions(COMMENT, ['create', 'update', 'delete', 'forPost']),
  ...actions(POST_LIKE, ['forPost', 'toggle']),
  ...actions(NOTIFICATION, ['me', 'unreadCount', 'markRead', 'markAllRead']),
  // Everyone has a profile, so everyone may edit their own. `updateMe` takes the target
  // from the token rather than the URL, which is what makes granting it to all four roles
  // safe: there is no id to tamper with.
  ...actions(PROFILE, ['show', 'updateMe']),
  // Reviewing is open to any signed-in account; *what* they may review is decided per
  // record in the controller, because a course needs enrollment and a post does not.
  ...actions(REVIEW, ['forTarget', 'submit', 'remove']),
  ...actions(CERTIFICATE, ['me', 'verify']),
  ...UPLOAD_ACTIONS,
];

/** Everything an admin can reach — the union of every other role plus the admin panel. */
const ADMIN_ACTIONS = [
  ...actions(COURSE, [...CRUD, 'bySlug', 'mine', 'myProgress', 'studentsProgress', 'insights', 'removeStudent', 'exportStudents']),
  ...actions(LESSON, CRUD),
  ...actions(QUIZ, [...CRUD, 'take']),
  ...actions(QUESTION, CRUD),
  ...actions(ENROLLMENT, CRUD),
  ...actions(PROGRESS, CRUD),
  ...actions(ATTEMPT, [...CRUD, 'forQuiz']),
  ...actions(BLOG, [...CRUD, 'mine', 'insights', 'publish', 'unpublish']),
  ...actions(PLATFORM, ['stats', 'users', 'updateUserRole', 'updateUserAccess', 'exportUsers']),
  // Read-only, and admin-only. There is no create, update or delete action to grant.
  ...actions(AUDIT, ['find']),
  ...actions(REVIEW, ['forTarget', 'submit', 'remove']),
  ...actions(CERTIFICATE, ['me', 'verify']),
  ...actions(PROFILE, ['show', 'updateMe']),
  ...actions(LEARNER, ['show']),
  ...actions(COMMENT, [...CRUD, 'forPost']),
  ...actions(POST_LIKE, [...CRUD, 'forPost', 'toggle']),
  ...actions(NOTIFICATION, [...CRUD, 'me', 'unreadCount', 'markRead', 'markAllRead']),
  ...UPLOAD_ACTIONS,
];

/**
 * Content Manager: the whole content library, no user management.
 * Note the absence of every `api::platform.*` action — that is the "Manage users & assign
 * roles ❌" row, enforced rather than merely hidden.
 */
const CONTENT_MANAGER_ACTIONS = [
  ...actions(COURSE, [...CRUD, 'bySlug', 'mine', 'studentsProgress', 'insights', 'removeStudent', 'exportStudents']),
  ...actions(LEARNER, ['show']),
  ...actions(LESSON, CRUD),
  ...actions(QUIZ, [...CRUD, 'take']),
  ...actions(QUESTION, CRUD),
  ...actions(ATTEMPT, ['forQuiz']),
  ...actions(BLOG, [...CRUD, 'mine', 'insights', 'publish', 'unpublish']),
  ...PARTICIPATION_ACTIONS,
];

/**
 * Instructor: same content verbs as a Content Manager, but every one of them is narrowed
 * to their own courses by `global::owns-course`. Blog is read-only — "Write / manage blog
 * posts ❌" — so no create/update/delete for BLOG here.
 */
const INSTRUCTOR_ACTIONS = [
  ...actions(COURSE, [...CRUD, 'bySlug', 'mine', 'studentsProgress', 'insights', 'removeStudent', 'exportStudents']),
  ...actions(LEARNER, ['show']),
  ...actions(LESSON, CRUD),
  ...actions(QUIZ, [...CRUD, 'take']),
  ...actions(QUESTION, CRUD),
  ...actions(ATTEMPT, ['forQuiz']),
  ...actions(BLOG, READ),
  ...PARTICIPATION_ACTIONS,
];

/**
 * Student: consume courses, never author them.
 * There is no `create`/`update`/`delete` on any content type, and the enrollment and
 * progress writes go through the scoped custom routes that take the user from the JWT.
 */
const STUDENT_ACTIONS = [
  ...actions(COURSE, [...COURSE_READ, 'myProgress']),
  ...actions(LESSON, READ),
  ...actions(QUIZ, ['take', 'submit']),
  ...actions(ENROLLMENT, ['enroll', 'me', 'unenroll']),
  ...actions(PROGRESS, ['complete', 'uncomplete']),
  ...actions(ATTEMPT, ['me']),
  ...actions(BLOG, READ),
  ...PARTICIPATION_ACTIONS,
];

/**
 * Public (logged out): the marketing surface. Course catalog and published blog posts —
 * the blog controller pins anonymous callers to `status=published`, so drafts stay
 * invisible even to a hand-crafted query string.
 */
const PUBLIC_ACTIONS = [
  ...actions(COURSE, COURSE_READ),
  ...actions(BLOG, READ),
  // The discussion under a published post is part of the post, so a logged-out visitor
  // reads both. Writing still requires an account.
  ...actions(COMMENT, ['forPost']),
  ...actions(POST_LIKE, ['forPost']),
  // Profiles are public: the point of them is that people can look each other up. Note
  // `show` without `updateMe` — reading is open, writing needs an account.
  ...actions(PROFILE, ['show']),
  // Ratings are part of the catalog, and a certificate whose verification page needs a
  // login is a certificate nobody can check.
  ...actions(REVIEW, ['forTarget']),
  ...actions(CERTIFICATE, ['verify']),
];

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
