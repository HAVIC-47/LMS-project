import { factories } from '@strapi/strapi';
import type { AuthUser } from '../../../utils/permissions';

/**
 * The recipient's own notifications.
 *
 * Every route here is scoped to `ctx.state.user`. There is no recipient parameter anywhere,
 * so there is no id to change in a URL to read somebody else's inbox, and the ownership
 * check on the write routes is a filter rather than a comparison that could be forgotten.
 */

type NotificationRow = {
  id: number;
  documentId: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
  actor?: { id: number; username: string } | null;
};

const toPublic = (row: NotificationRow) => ({
  documentId: row.documentId,
  type: row.type,
  title: row.title,
  body: row.body,
  href: row.href,
  read: row.read,
  createdAt: row.createdAt,
  actor: row.actor ? { id: row.actor.id, username: row.actor.username } : null,
});

export default factories.createCoreController(
  'api::notification.notification',
  ({ strapi }) => ({
    /**
     * GET /api/notifications/me
     *
     * Newest first, capped. An inbox nobody has opened in months should not turn into a
     * multi-megabyte response; the cap is generous enough that the UI never paginates.
     */
    async me(ctx) {
      const user = ctx.state.user as AuthUser;

      const rows = (await strapi.db.query('api::notification.notification').findMany({
        where: { recipient: { id: user.id } },
        populate: { actor: true },
        orderBy: { createdAt: 'desc' },
        limit: 50,
      })) as NotificationRow[];

      const unread = await strapi.db
        .query('api::notification.notification')
        .count({ where: { recipient: { id: user.id }, read: false } });

      return { data: rows.map(toPublic), meta: { unread } };
    },

    /**
     * GET /api/notifications/unread-count
     *
     * Just the number, for the badge. Separate from `/me` because the header polls this and
     * has no use for the bodies.
     */
    async unreadCount(ctx) {
      const user = ctx.state.user as AuthUser;

      const unread = await strapi.db
        .query('api::notification.notification')
        .count({ where: { recipient: { id: user.id }, read: false } });

      return { data: { unread } };
    },

    /** POST /api/notifications/:id/read */
    async markRead(ctx) {
      const user = ctx.state.user as AuthUser;

      // Scoped by recipient in the same query rather than fetched and then compared, so
      // there is no path where the check is skipped.
      const updated = await strapi.db.query('api::notification.notification').updateMany({
        where: { documentId: ctx.params.id, recipient: { id: user.id } },
        data: { read: true, readAt: new Date().toISOString() },
      });

      if (!updated || updated.count === 0) {
        return ctx.notFound('Notification not found');
      }

      return { data: { read: true } };
    },

    /** POST /api/notifications/read-all */
    async markAllRead(ctx) {
      const user = ctx.state.user as AuthUser;

      await strapi.db.query('api::notification.notification').updateMany({
        where: { recipient: { id: user.id }, read: false },
        data: { read: true, readAt: new Date().toISOString() },
      });

      return { data: { unread: 0 } };
    },
  })
);
