import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const ADMIN_ONLY = [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }];

/**
 * The generic CRUD surface is closed. `create` accepts a `user` relation, so leaving it
 * open would let one account like a post on behalf of another. Liking goes through the
 * toggle route, where the user comes from the JWT.
 */
export default factories.createCoreRouter('api::post-like.post-like', {
  config: {
    find: { policies: ADMIN_ONLY },
    findOne: { policies: ADMIN_ONLY },
    create: { policies: ADMIN_ONLY },
    update: { policies: ADMIN_ONLY },
    delete: { policies: ADMIN_ONLY },
  },
});
