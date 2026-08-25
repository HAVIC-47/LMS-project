import type { Core } from '@strapi/strapi';

/**
 * Lookup helpers shared by policies and controllers.
 *
 * These use `strapi.db.query` rather than the Document Service on purpose: policies and
 * ownership checks need the *numeric* primary key to filter relations (`where: { course:
 * { id } }`), while the Document Service speaks documentId. Resolving once here keeps that
 * translation out of every call site.
 *
 * Note on ids: in Strapi 5 the `:id` segment of a REST route is the **documentId**, not the
 * numeric id. Every `...DocumentId` argument below is what arrives in `ctx.params.id`.
 */

export type ResolvedCourse = {
  id: number;
  documentId: string;
  title: string;
  isPublished: boolean;
  owner?: { id: number } | null;
};

export const findCourseByDocumentId = async (
  strapi: Core.Strapi,
  documentId: string
): Promise<ResolvedCourse | null> => {
  if (!documentId) return null;

  return strapi.db.query('api::course.course').findOne({
    where: { documentId },
    populate: { owner: true },
  });
};

/** Lessons belong to a course; ownership of the lesson is ownership of its course. */
export const findCourseByLessonDocumentId = async (
  strapi: Core.Strapi,
  lessonDocumentId: string
): Promise<ResolvedCourse | null> => {
  if (!lessonDocumentId) return null;

  const lesson = await strapi.db.query('api::lesson.lesson').findOne({
    where: { documentId: lessonDocumentId },
    populate: { course: { populate: { owner: true } } },
  });

  return (lesson?.course as ResolvedCourse) ?? null;
};

/** Same idea for quizzes and their questions. */
export const findCourseByQuizDocumentId = async (
  strapi: Core.Strapi,
  quizDocumentId: string
): Promise<ResolvedCourse | null> => {
  if (!quizDocumentId) return null;

  const quiz = await strapi.db.query('api::quiz.quiz').findOne({
    where: { documentId: quizDocumentId },
    populate: { course: { populate: { owner: true } } },
  });

  return (quiz?.course as ResolvedCourse) ?? null;
};

export const findCourseByQuestionDocumentId = async (
  strapi: Core.Strapi,
  questionDocumentId: string
): Promise<ResolvedCourse | null> => {
  if (!questionDocumentId) return null;

  const question = await strapi.db.query('api::question.question').findOne({
    where: { documentId: questionDocumentId },
    populate: { quiz: { populate: { course: { populate: { owner: true } } } } },
  });

  return (question?.quiz?.course as ResolvedCourse) ?? null;
};

/**
 * A relation input from the client can arrive in several shapes:
 *   { course: 5 }                      numeric id
 *   { course: "abc123" }               documentId
 *   { course: { connect: [...] } }      Document Service relation syntax
 * Normalising here means the controllers only ever deal with one of them.
 */
export const readRelationInput = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;

  if (typeof value === 'object') {
    const asRecord = value as Record<string, unknown>;
    if (typeof asRecord.documentId === 'string') return asRecord.documentId;
    if (typeof asRecord.id === 'number' || typeof asRecord.id === 'string') {
      return asRecord.id as string | number;
    }
    if (Array.isArray(asRecord.connect) && asRecord.connect.length > 0) {
      return readRelationInput(asRecord.connect[0]);
    }
    if (Array.isArray(asRecord.set) && asRecord.set.length > 0) {
      return readRelationInput(asRecord.set[0]);
    }
  }

  return null;
};

/** Accepts either a numeric id or a documentId and always returns the full course row. */
export const findCourseByAnyId = async (
  strapi: Core.Strapi,
  idOrDocumentId: string | number | null
): Promise<ResolvedCourse | null> => {
  if (idOrDocumentId === null) return null;

  const where =
    typeof idOrDocumentId === 'number' || /^\d+$/.test(String(idOrDocumentId))
      ? { id: Number(idOrDocumentId) }
      : { documentId: String(idOrDocumentId) };

  return strapi.db.query('api::course.course').findOne({ where, populate: { owner: true } });
};

export const findQuizByAnyId = async (strapi: Core.Strapi, idOrDocumentId: string | number | null) => {
  if (idOrDocumentId === null) return null;

  const where =
    typeof idOrDocumentId === 'number' || /^\d+$/.test(String(idOrDocumentId))
      ? { id: Number(idOrDocumentId) }
      : { documentId: String(idOrDocumentId) };

  return strapi.db.query('api::quiz.quiz').findOne({
    where,
    populate: { course: { populate: { owner: true } } },
  });
};

/**
 * Attaches a user to a content entry (a course's `owner`, a post's `author`) *outside* the
 * content API.
 *
 * This exists because of a specific Strapi behaviour: the content API refuses any relation
 * input whose target the caller cannot `find`. Since no application role is granted
 * `plugin::users-permissions.user.find` — deliberately, so the user list stays closed —
 * sending `owner` through `super.create()` fails with "Invalid key owner".
 *
 * Opening up the user list to work around that would trade a real access control boundary
 * for convenience. Instead the entry is created without the relation, and the relation is
 * set here through the query engine, which is server-side and needs no caller permission.
 */
export const linkUserRelation = async (
  strapi: Core.Strapi,
  uid: 'api::course.course' | 'api::blog-post.blog-post',
  documentId: string,
  field: 'owner' | 'author',
  userId: number
): Promise<void> => {
  const rows = await strapi.db.query(uid).findMany({ where: { documentId }, select: ['id'] });

  // Draft & Publish keeps a draft row and a published row per document; both need the link.
  for (const row of rows as { id: number }[]) {
    await strapi.db.query(uid).update({ where: { id: row.id }, data: { [field]: userId } });
  }
};

/** Enrollment gate — used for lesson bodies, quiz taking and quiz submission. */
export const isEnrolled = async (
  strapi: Core.Strapi,
  userId: number,
  courseId: number
): Promise<boolean> => {
  if (!userId || !courseId) return false;

  const count = await strapi.db.query('api::enrollment.enrollment').count({
    where: { student: { id: userId }, course: { id: courseId } },
  });

  return count > 0;
};

/**
 * The numeric ids of the courses an instructor owns.
 *
 * Scoping a content-API list by `course.owner.id` looks natural and does not work: the
 * query validator rejects any filter path that walks into a relation the caller cannot
 * read, and no application role is granted `plugin::users-permissions.user.find`. The
 * result is a 400, not a filtered list.
 *
 * `strapi.db.query` is the lower-level API and is not subject to that validation, so the
 * owner lookup happens here and callers filter on `course.id.$in` instead, which is a
 * plain scalar path the validator accepts.
 */
export const findOwnedCourseIds = async (
  strapi: Core.Strapi,
  userId: number
): Promise<number[]> => {
  const courses = await strapi.db.query('api::course.course').findMany({
    where: { owner: { id: userId } },
    select: ['id'],
  });

  return (courses as { id: number }[]).map((course) => course.id);
};

/**
 * Combines a caller's filters with a scope the caller must not be able to escape.
 *
 * Spreading them into one object looks equivalent and is not: both the client filter and
 * the scope are usually keyed on the same relation, so `{ ...clientFilters, course: scope }`
 * silently deletes the client's `course` condition. That is how a request for "the quiz
 * belonging to course X" came back with a quiz from a different course.
 *
 * `$and` keeps both. The scope is a separate branch, so a client filter can only ever
 * narrow the result further, never widen it past the scope.
 */
export const withScope = (
  clientFilters: unknown,
  scope: Record<string, unknown>
): Record<string, unknown> => {
  const hasClientFilters =
    clientFilters && typeof clientFilters === 'object' && Object.keys(clientFilters).length > 0;

  return hasClientFilters
    ? { $and: [clientFilters as Record<string, unknown>, scope] }
    : scope;
};
