import { ROLES } from '../../../utils/permissions';

const SIGNED_IN = [
  {
    name: 'global::has-role',
    config: { roles: [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR, ROLES.STUDENT] },
  },
];

export default {
  routes: [
    { method: 'GET', path: '/notifications/me', handler: 'notification.me', config: { policies: SIGNED_IN } },
    {
      method: 'GET',
      path: '/notifications/unread-count',
      handler: 'notification.unreadCount',
      config: { policies: SIGNED_IN },
    },
    {
      method: 'POST',
      path: '/notifications/read-all',
      handler: 'notification.markAllRead',
      config: { policies: SIGNED_IN },
    },
    {
      method: 'POST',
      path: '/notifications/:id/read',
      handler: 'notification.markRead',
      config: { policies: SIGNED_IN },
    },
  ],
};
