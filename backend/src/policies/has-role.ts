import type { Core } from '@strapi/strapi';
import { getRoleType, type RoleType } from '../utils/permissions';

/**
 * Route-level role gate.
 *
 *   config: { policies: [{ name: 'global::has-role', config: { roles: ['admin'] } }] }
 *
 * This is the *second* of three enforcement layers. The first is the users-permissions
 * grid (can this role call this route at all), this one hard-codes the rule in source so
 * the route stays locked even if someone flips a checkbox in the Strapi admin UI, and the
 * third is the ownership check inside the controller.
 */
export default (
  policyContext: { state: { user?: unknown } },
  config: { roles?: RoleType[] } | undefined,
  { strapi }: { strapi: Core.Strapi }
): boolean => {
  const user = policyContext.state.user as Parameters<typeof getRoleType>[0];

  if (!user) {
    return false;
  }

  const allowedRoles = config?.roles ?? [];

  if (allowedRoles.length === 0) {
    strapi.log.warn('[global::has-role] used without a `roles` config — denying by default.');
    return false;
  }

  const roleType = getRoleType(user);

  return roleType !== null && (allowedRoles as string[]).includes(roleType);
};
