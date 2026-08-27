import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const EVERY_ROLE = [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR, ROLES.STUDENT];

/**
 * Every signed-in role may post, edit and delete here -- but this layer only decides who
 * may *call* the endpoint. Whether a given call is allowed on a given comment is decided
 * in the controller, which is where the interesting rule lives: a student may reply to
 * their own comment and to nobody else's.
 *
 * That split is deliberate. A route policy sees the role and the URL; it cannot see who
 * wrote the comment being replied to, so it cannot enforce the rule. Putting the whole
 * check in the controller keeps it in one readable place instead of half-expressed twice.
 *
 * `find` and `findOne` stay admin-only. Reading happens through
 * `/course-comments/course/:id`, which returns one course's thread already shaped; the
 * generic list route would hand out every comment on the platform in a single request.
 */
export default factories.createCoreRouter('api::course-comment.course-comment', {
  config: {
    find: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    findOne: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    create: { policies: [{ name: 'global::has-role', config: { roles: EVERY_ROLE } }] },
    update: { policies: [{ name: 'global::has-role', config: { roles: EVERY_ROLE } }] },
    delete: { policies: [{ name: 'global::has-role', config: { roles: EVERY_ROLE } }] },
  },
});
