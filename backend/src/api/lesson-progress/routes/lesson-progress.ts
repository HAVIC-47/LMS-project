import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const ADMIN_ONLY = [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }];

/** Raw progress rows are an admin-only view; students read their numbers through the
 *  course and enrollment endpoints, which scope everything to the caller. */
export default factories.createCoreRouter('api::lesson-progress.lesson-progress', {
  config: {
    find: { policies: ADMIN_ONLY },
    findOne: { policies: ADMIN_ONLY },
    create: { policies: ADMIN_ONLY },
    update: { policies: ADMIN_ONLY },
    delete: { policies: ADMIN_ONLY },
  },
});
