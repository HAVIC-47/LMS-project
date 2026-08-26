import { randomBytes } from 'crypto';
import type { Core } from '@strapi/strapi';
import { computeCourseProgress } from './progress';

/**
 * Issuing a certificate.
 *
 * Two conditions, both required: every lesson complete, and — if the course has any
 * quizzes — at least one passed. A course with no quiz needs only the lessons, because
 * demanding a pass on an assessment that does not exist would make those courses
 * uncompletable.
 *
 * Called after the two events that can satisfy those conditions — marking a lesson complete
 * and submitting a quiz — rather than on a schedule, so a certificate appears at the moment
 * it is earned. It is idempotent: one certificate per student per course, and a second call
 * returns the existing one rather than minting a duplicate.
 *
 * The record snapshots the student's name and the course title. A certificate is a
 * statement about a day, and it has to keep saying the same thing after somebody renames
 * their account or retitles the course.
 */

/**
 * The public handle for the verification page.
 *
 * Random rather than sequential: the page is open to anyone holding the link, so a
 * predictable id would let a visitor walk the whole list of graduates. Base32-ish alphabet
 * with the ambiguous characters removed, because these get read aloud and typed by hand.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const makeSerial = (): string => {
  const bytes = randomBytes(12);
  const body = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
  return `CC-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
};

export const issueCertificateIfEarned = async (
  strapi: Core.Strapi,
  studentId: number,
  courseId: number
): Promise<{ serial: string } | null> => {
  try {
    const existing = await strapi.db.query('api::certificate.certificate').findOne({
      where: { student: { id: studentId }, course: { id: courseId } },
      select: ['serial'],
    });

    if (existing) return { serial: existing.serial };

    const progress = await computeCourseProgress(strapi, studentId, courseId);

    // A course with no lessons is not "finished" at 0 of 0 — that would hand out a
    // certificate for an empty course the moment anybody enrolled.
    if (progress.total === 0 || progress.completed < progress.total) return null;

    const quizCount = await strapi.db
      .query('api::quiz.quiz')
      .count({ where: { course: { id: courseId } } });

    const attempts = (await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { student: { id: studentId }, course: { id: courseId } },
      select: ['score', 'passed'],
    })) as { score: number; passed: boolean }[];

    if (quizCount > 0 && !attempts.some((attempt) => attempt.passed)) return null;

    const [student, course] = await Promise.all([
      strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: studentId },
        select: ['username', 'displayName'],
      }),
      strapi.db.query('api::course.course').findOne({
        where: { id: courseId },
        select: ['title'],
      }),
    ]);

    if (!student || !course) return null;

    const serial = makeSerial();

    await strapi.documents('api::certificate.certificate').create({
      data: {
        serial,
        student: studentId,
        course: courseId,
        studentLabel: student.displayName || student.username,
        courseLabel: course.title,
        issuedAt: new Date().toISOString(),
        lessonsCompleted: progress.completed,
        bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : undefined,
      },
    });

    return { serial };
  } catch (error) {
    // Same rule as notifications: this must never be the reason marking a lesson complete
    // fails. A missed certificate is re-issued by the next qualifying action.
    strapi.log.error(`[lms] certificate issue failed: ${(error as Error).message}`);
    return null;
  }
};
