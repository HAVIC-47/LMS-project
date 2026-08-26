import type { Core } from '@strapi/strapi';
import { DEFAULT_MAX_ATTEMPTS } from '../utils/attempts';

/**
 * One-time backfills for columns added to tables that already had rows.
 *
 * A new attribute is null on every existing row, and null is not the same as the default:
 * Strapi applies a default when *creating*, never retroactively. Without this, every quiz
 * that existed before attempt limits were added would show an empty field in the editor and
 * fall back to the code default rather than a value anybody can see or change.
 *
 * Idempotent, and cheap enough to run on every boot: it only touches rows that are still
 * null, so the second run updates nothing.
 */
/**
 * The demo accounts accumulated attempts before any cap existed — one of them had fifty on
 * a five-question quiz, courtesy of repeated test runs. Introducing a limit retroactively
 * locked those accounts out of the very quiz a reviewer is most likely to open.
 *
 * This trims the seeded accounts back under the cap, keeping the most recent attempts so
 * the history panel still has something in it. It only ever touches `@lms.test` accounts
 * and only runs alongside the demo seed, so a real deployment is never affected.
 */
const trimDemoAttempts = async (strapi: Core.Strapi): Promise<void> => {
  const KEEP = 2;

  const demoUsers = (await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { email: { $endsWith: '@lms.test' } },
    select: ['id'],
  })) as { id: number }[];

  if (demoUsers.length === 0) return;

  let removed = 0;

  for (const user of demoUsers) {
    const attempts = (await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { student: { id: user.id } },
      populate: { quiz: true },
      orderBy: { submittedAt: 'desc' },
    })) as { id: number; quiz?: { id: number } | null }[];

    const seen = new Map<number, number>();
    const doomed: number[] = [];

    for (const attempt of attempts) {
      const quizId = attempt.quiz?.id;
      if (typeof quizId !== 'number') continue;

      const count = (seen.get(quizId) ?? 0) + 1;
      seen.set(quizId, count);

      // Newest first, so anything past the keep count is the oldest.
      if (count > KEEP) doomed.push(attempt.id);
    }

    for (const id of doomed) {
      await strapi.db.query('api::quiz-attempt.quiz-attempt').delete({ where: { id } });
      removed += 1;
    }
  }

  if (removed > 0) {
    strapi.log.info(`[lms] trimmed ${removed} surplus demo quiz attempts`);
  }
};

export const backfillQuizAttemptLimits = async (strapi: Core.Strapi): Promise<void> => {
  try {
    const { count } = await strapi.db.query('api::quiz.quiz').updateMany({
      where: { maxAttempts: { $null: true } },
      data: { maxAttempts: DEFAULT_MAX_ATTEMPTS },
    });

    const cooldown = await strapi.db.query('api::quiz.quiz').updateMany({
      where: { cooldownMinutes: { $null: true } },
      data: { cooldownMinutes: 0 },
    });

    if (count || cooldown.count) {
      strapi.log.info(
        `[lms] backfilled attempt limits on ${count} quiz${count === 1 ? '' : 'zes'}`
      );
    }

    // Only with the demo seed on. A production database has no `@lms.test` accounts, and
    // deleting graded attempts is not something to do on a hunch.
    if (process.env.SEED_DEMO_DATA === 'true') {
      await trimDemoAttempts(strapi);
    }
  } catch (error) {
    strapi.log.error(`[lms] attempt-limit backfill failed: ${(error as Error).message}`);
  }
};
