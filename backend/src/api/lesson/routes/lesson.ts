import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const AUTHORS = [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR];

export default factories.createCoreRouter('api::lesson.lesson', {
  config: {
    create: {
      // No `owns-course` here — there is no lesson yet. The controller reads the parent
      // course from the body and checks ownership against it.
      policies: [{ name: 'global::has-role', config: { roles: AUTHORS } }],
    },
    update: {
      policies: [
        { name: 'global::has-role', config: { roles: AUTHORS } },
        { name: 'global::owns-course', config: { subject: 'lesson' } },
      ],
    },
    delete: {
      policies: [
        { name: 'global::has-role', config: { roles: AUTHORS } },
        { name: 'global::owns-course', config: { subject: 'lesson' } },
      ],
    },
  },
});
