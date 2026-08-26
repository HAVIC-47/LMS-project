import type { Core } from '@strapi/strapi';

/**
 * How many times a student may sit one quiz, and how soon.
 *
 * Two independent controls, because they answer different failure modes. A **cap** stops
 * someone brute-forcing a four-option quiz until they pass — with five questions and
 * unlimited retries, a pass says nothing about knowledge. A **cooldown** stops the second
 * attempt arriving four seconds after the first, which is the shape of guessing rather than
 * of revising.
 *
 * `maxAttempts: 0` means unlimited, so a practice quiz is still expressible. `0` rather than
 * `null` because the column has a default and a nullable integer would leave three states
 * (`0`, `null`, unset) meaning roughly the same thing.
 *
 * Counted from stored attempts rather than from a counter on the enrollment. A counter can
 * drift from the rows it claims to describe; `count()` cannot.
 */

/**
 * Applied when a quiz has no value of its own.
 *
 * A column added to an existing table is null on every row that predates it, and treating
 * null as "explicitly unlimited" would silently exempt every quiz created before the
 * feature existed — which is all of them. Null means "never configured" and gets the
 * default; only a deliberate `0` means unlimited.
 */
export const DEFAULT_MAX_ATTEMPTS = 4;

export type QuizLimits = {
  id: number;
  maxAttempts?: number | null;
  cooldownMinutes?: number | null;
};

export type AttemptStatus = {
  used: number;
  maxAttempts: number;
  /** Null when unlimited. */
  remaining: number | null;
  cooldownMinutes: number;
  /** ISO timestamp the next attempt becomes available, or null if it already is. */
  availableAt: string | null;
  allowed: boolean;
  reason: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const getAttemptStatus = async (
  strapi: Core.Strapi,
  studentId: number,
  quiz: QuizLimits
): Promise<AttemptStatus> => {
  const maxAttempts = Math.max(0, quiz.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const cooldownMinutes = Math.max(0, quiz.cooldownMinutes ?? 0);

  const attempts = (await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
    where: { student: { id: studentId }, quiz: { id: quiz.id } },
    select: ['submittedAt'],
    orderBy: { submittedAt: 'desc' },
    limit: 1,
  })) as { submittedAt: string }[];

  const used = await strapi.db.query('api::quiz-attempt.quiz-attempt').count({
    where: { student: { id: studentId }, quiz: { id: quiz.id } },
  });

  const remaining = maxAttempts === 0 ? null : Math.max(0, maxAttempts - used);

  if (remaining === 0) {
    return {
      used,
      maxAttempts,
      remaining,
      cooldownMinutes,
      availableAt: null,
      allowed: false,
      reason: `You have used all ${plural(maxAttempts, 'attempt')} on this quiz.`,
    };
  }

  if (cooldownMinutes > 0 && attempts.length > 0) {
    const last = new Date(attempts[0].submittedAt).getTime();
    const ready = last + cooldownMinutes * 60_000;

    if (Number.isFinite(last) && Date.now() < ready) {
      const minutesLeft = Math.ceil((ready - Date.now()) / 60_000);

      return {
        used,
        maxAttempts,
        remaining,
        cooldownMinutes,
        availableAt: new Date(ready).toISOString(),
        allowed: false,
        reason: `You can try again in ${plural(minutesLeft, 'minute')}.`,
      };
    }
  }

  return {
    used,
    maxAttempts,
    remaining,
    cooldownMinutes,
    availableAt: null,
    allowed: true,
    reason: '',
  };
};

/** The guard used by `submit`. Same computation, read as a yes or no. */
export const checkAttemptLimit = getAttemptStatus;
