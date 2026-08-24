import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const ADMIN_ONLY = [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }];

/**
 * Scores are produced by the grader and nothing else. Even an admin has no reason to
 * create or edit an attempt through the API, so the write routes stay closed and the
 * read routes are admin-only; everyone else uses the scoped `/me` and `/quiz/:id` routes.
 */
export default factories.createCoreRouter('api::quiz-attempt.quiz-attempt', {
  config: {
    find: { policies: ADMIN_ONLY },
    findOne: { policies: ADMIN_ONLY },
    create: { policies: ADMIN_ONLY },
    update: { policies: ADMIN_ONLY },
    delete: { policies: ADMIN_ONLY },
  },
});
