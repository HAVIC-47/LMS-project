import { ROLES } from '../../../utils/permissions';

/**
 * One route, and only a read. The absence of create, update and delete here is the whole
 * design: entries are written server-side by the actions they describe, and nothing can
 * edit or remove one through the API.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-log.find',
      config: {
        policies: [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }],
      },
    },
  ],
};
