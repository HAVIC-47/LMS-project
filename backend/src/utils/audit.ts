import type { Core } from '@strapi/strapi';
import type { AuthUser } from './permissions';

/**
 * Append-only record of privileged actions.
 *
 * Four writes in this application can change what somebody else is allowed to do: assigning
 * a role, blocking an account, restricting it from a feature, and removing a student from a
 * course. Before this, none of them left a trace — the permission matrix was enforced, but
 * unprovable after the fact.
 *
 * Two rules make the record trustworthy:
 *
 *   **Nothing edits or deletes it.** There is no update or delete route, and the admin read
 *   is the only route at all. An audit trail an administrator can quietly tidy is not one.
 *
 *   **Names are snapshotted, not joined.** `actorLabel` and `targetLabel` are copied at the
 *   moment of the action. A relation would keep the row honest about *who* but not about
 *   *what they were called*, and an entry whose meaning changes when somebody renames their
 *   account is worse than no entry.
 *
 * Like notifications, a failed write is swallowed. The audit trail exists to explain an
 * action that happened; it must never be the reason one fails.
 */

export const AUDIT_ACTIONS = {
  ROLE_CHANGED: 'role.changed',
  USER_BLOCKED: 'user.blocked',
  USER_UNBLOCKED: 'user.unblocked',
  COURSE_ACCESS_RESTRICTED: 'access.course.restricted',
  COURSE_ACCESS_RESTORED: 'access.course.restored',
  BLOG_ACCESS_RESTRICTED: 'access.blog.restricted',
  BLOG_ACCESS_RESTORED: 'access.blog.restored',
  STUDENT_REMOVED: 'enrollment.removed',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

type AuditEntry = {
  action: AuditAction;
  actor: AuthUser;
  targetType: 'user' | 'enrollment';
  targetId: string | number;
  targetLabel: string;
  summary: string;
  /** Anything worth keeping beyond the summary — the before and after of a change. */
  details?: Record<string, string | number | boolean | null>;
};

export const recordAudit = async (strapi: Core.Strapi, entry: AuditEntry): Promise<void> => {
  try {
    await strapi.documents('api::audit-log.audit-log').create({
      data: {
        action: entry.action,
        actor: entry.actor.id,
        actorLabel: entry.actor.username ?? entry.actor.email ?? `user ${entry.actor.id}`,
        targetType: entry.targetType,
        targetId: String(entry.targetId),
        targetLabel: entry.targetLabel,
        summary: entry.summary,
        details: entry.details,
      },
    });
  } catch (error) {
    strapi.log.error(`[lms] audit write failed: ${(error as Error).message}`);
  }
};
