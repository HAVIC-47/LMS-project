import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const AUTHORS = [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR];

/**
 * Core CRUD for courses.
 *
 * `has-role` answers "may this kind of user write courses at all", `owns-course` answers
 * "may this particular user write *this* course". Both run before the controller, so the
 * controller can assume the caller is allowed to be there.
 */
export default factories.createCoreRouter('api::course.course', {
  config: {
    create: {
      policies: [{ name: 'global::has-role', config: { roles: AUTHORS } }],
    },
    update: {
      policies: [
        { name: 'global::has-role', config: { roles: AUTHORS } },
        { name: 'global::owns-course', config: { subject: 'course' } },
      ],
    },
    delete: {
      policies: [
        { name: 'global::has-role', config: { roles: AUTHORS } },
        { name: 'global::owns-course', config: { subject: 'course' } },
      ],
    },
  },
});
