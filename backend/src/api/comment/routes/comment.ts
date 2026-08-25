import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const EVERY_ROLE = [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR, ROLES.STUDENT];

/**
 * Commenting is open to every signed-in role, which is the point: a blog the platform's
 * own instructors cannot reply on is not a discussion.
 *
 * `find` and `findOne` stay closed. Reading happens through `/comments/post/:id`, which
 * returns the thread already shaped and scoped to one post; the generic list route would
 * hand out every comment on the platform in one request.
 */
export default factories.createCoreRouter('api::comment.comment', {
  config: {
    find: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    findOne: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    create: { policies: [{ name: 'global::has-role', config: { roles: EVERY_ROLE } }] },
    update: { policies: [{ name: 'global::has-role', config: { roles: EVERY_ROLE } }] },
    delete: { policies: [{ name: 'global::has-role', config: { roles: EVERY_ROLE } }] },
  },
});
