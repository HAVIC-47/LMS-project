import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const ADMIN_ONLY = [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }];

/**
 * Notifications are written by the server, never by a client. Every generic route stays
 * closed: `create` would let anyone forge a notification in somebody else's inbox, and
 * `find` would expose every inbox on the platform.
 */
export default factories.createCoreRouter('api::notification.notification', {
  config: {
    find: { policies: ADMIN_ONLY },
    findOne: { policies: ADMIN_ONLY },
    create: { policies: ADMIN_ONLY },
    update: { policies: ADMIN_ONLY },
    delete: { policies: ADMIN_ONLY },
  },
});
