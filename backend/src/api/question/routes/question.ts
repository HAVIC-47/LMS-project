import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const AUTHORS = [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR];

export default factories.createCoreRouter('api::question.question', {
  config: {
    find: { policies: [{ name: 'global::has-role', config: { roles: AUTHORS } }] },
    findOne: { policies: [{ name: 'global::has-role', config: { roles: AUTHORS } }] },
    create: { policies: [{ name: 'global::has-role', config: { roles: AUTHORS } }] },
    update: {
      policies: [
        { name: 'global::has-role', config: { roles: AUTHORS } },
        { name: 'global::owns-course', config: { subject: 'question' } },
      ],
    },
    delete: {
      policies: [
        { name: 'global::has-role', config: { roles: AUTHORS } },
        { name: 'global::owns-course', config: { subject: 'question' } },
      ],
    },
  },
});
