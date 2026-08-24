import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

/**
 * The generic CRUD surface for enrollments is admin-only.
 *
 * `POST /api/enrollments` accepts a `student` relation, so leaving it open to students
 * would let one account enroll another. Students use the custom `/enrollments/enroll`
 * route instead, where the student is taken from the JWT and cannot be supplied.
 */
export default factories.createCoreRouter('api::enrollment.enrollment', {
  config: {
    find: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    findOne: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    create: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    update: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
    delete: { policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }] },
  },
});
