import type { Core } from '@strapi/strapi';

/**
 * Notifications.
 *
 * One function that every feature calls when something happens that somebody else should
 * know about. Keeping it in one place matters because the rules that make notifications
 * bearable are easy to forget at an individual call site:
 *
 *   - Never notify someone about their own action. Commenting on your own post, liking
 *     your own post, or enrolling in a course you own should produce nothing.
 *   - Never fail the originating request. A notification is a side effect; if writing one
 *     throws, the enrollment or the comment that caused it must still succeed. Every call
 *     here is fire-and-forget with its own error handling.
 *   - Deduplicate recipients, so a fan-out cannot send the same person two copies.
 */

export type NotificationType =
  | 'comment-on-post'
  | 'reply-to-comment'
  | 'post-liked'
  | 'course-enrolled'
  | 'quiz-submitted'
  | 'quiz-result'
  | 'course-published'
  | 'lesson-added'
  | 'post-published'
  | 'role-changed'
  | 'course-reviewed';

type NotifyInput = {
  recipientId: number | null | undefined;
  actorId?: number | null;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
};

const MAX_TITLE = 160;
const MAX_BODY = 400;

/** Keeps a quoted excerpt inside the column limit without cutting mid-word. */
export const excerpt = (value: string | null | undefined, limit = 120): string => {
  if (!value) return '';

  const flat = value.replace(/\s+/g, ' ').trim();

  if (flat.length <= limit) return flat;

  return `${flat.slice(0, flat.lastIndexOf(' ', limit) > 0 ? flat.lastIndexOf(' ', limit) : limit)}...`;
};

export async function notify(strapi: Core.Strapi, input: NotifyInput): Promise<void> {
  const { recipientId, actorId, type, title, body, href } = input;

  if (!recipientId) return;

  // Nobody wants to be told about something they just did themselves.
  if (actorId && actorId === recipientId) return;

  try {
    await strapi.documents('api::notification.notification').create({
      data: {
        recipient: recipientId,
        actor: actorId ?? null,
        type,
        title: title.slice(0, MAX_TITLE),
        body: body ? body.slice(0, MAX_BODY) : undefined,
        href: href ?? undefined,
        read: false,
      },
    });
  } catch (error) {
    // Deliberately swallowed. The action that triggered this has already succeeded and
    // must not be rolled back because a notification could not be written.
    strapi.log.error(`[lms] could not write a ${type} notification: ${(error as Error).message}`);
  }
}

/** Fan-out to several people at once, with duplicates and the actor removed. */
export async function notifyMany(
  strapi: Core.Strapi,
  recipientIds: (number | null | undefined)[],
  input: Omit<NotifyInput, 'recipientId'>
): Promise<void> {
  const unique = Array.from(
    new Set(recipientIds.filter((id): id is number => typeof id === 'number'))
  );

  await Promise.all(unique.map((recipientId) => notify(strapi, { ...input, recipientId })));
}

/** Everyone enrolled in a course, for announcements about that course. */
export async function findEnrolledStudentIds(
  strapi: Core.Strapi,
  courseId: number
): Promise<number[]> {
  const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
    where: { course: { id: courseId } },
    populate: { student: true },
  });

  return (enrollments as { student?: { id: number } | null }[])
    .map((enrollment) => enrollment.student?.id)
    .filter((id): id is number => typeof id === 'number');
}
