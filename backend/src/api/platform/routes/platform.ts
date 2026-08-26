import { ROLES } from '../../../utils/permissions';

const ADMIN_ONLY = [{ name: 'global::has-role', config: { roles: [ROLES.ADMIN] } }];

/**
 * "A dedicated admin dashboard, accessible only to the admin role."
 *
 * Every route here carries the same policy. The users-permissions grid also only grants
 * these actions to the admin role, so a non-admin is stopped twice: once by the grid and
 * once by the policy.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/platform/stats',
      handler: 'platform.stats',
      config: { policies: ADMIN_ONLY },
    },
    {
      method: 'GET',
      path: '/platform/users',
      handler: 'platform.users',
      config: { policies: ADMIN_ONLY },
    },
    {
      method: 'PUT',
      path: '/platform/users/:id/access',
      handler: 'platform.updateUserAccess',
      config: { policies: ADMIN_ONLY },
    },
    {
      method: 'PUT',
      path: '/platform/users/:id/role',
      handler: 'platform.updateUserRole',
      config: { policies: ADMIN_ONLY },
    },
  ],
};
