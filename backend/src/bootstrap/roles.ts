import type { Core } from '@strapi/strapi';
import { ROLES } from '../utils/permissions';
import { AUTHENTICATED_PLUGIN_ACTIONS, PERMISSION_MAP, ROLE_DEFINITIONS } from './permission-map';

const ROLE_UID = 'plugin::users-permissions.role';
const PERMISSION_UID = 'plugin::users-permissions.permission';

/** Creates the four application roles if they are not there yet. Existing roles are left
 *  alone so a rename in the admin UI is not undone on every restart. */
export const ensureRoles = async (strapi: Core.Strapi) => {
  for (const definition of ROLE_DEFINITIONS) {
    const existing = await strapi.db.query(ROLE_UID).findOne({ where: { type: definition.type } });

    if (existing) continue;

    await strapi.db.query(ROLE_UID).create({
      data: {
        name: definition.name,
        description: definition.description,
        type: definition.type,
      },
    });

    strapi.log.info(`[lms] created role "${definition.name}" (${definition.type})`);
  }
};

/**
 * Brings a role's permissions in line with the map — creating what is missing and, just as
 * importantly, **removing what should not be there**. A permission that was switched on by
 * hand in the admin UI is switched back off on the next boot, so the running configuration
 * always matches the code.
 *
 * Only `api::` actions are reconciled. The `plugin::` ones (login, register, forgot
 * password, the email confirmation flow) are Strapi's own and are left untouched apart
 * from the explicit additions below — deleting those would break authentication itself.
 */
const syncRolePermissions = async (strapi: Core.Strapi, roleType: string, desired: string[]) => {
  const role = await strapi.db.query(ROLE_UID).findOne({ where: { type: roleType } });

  if (!role) {
    strapi.log.warn(`[lms] role "${roleType}" not found while applying permissions`);
    return;
  }

  const existing = await strapi.db.query(PERMISSION_UID).findMany({
    where: { role: { id: role.id } },
  });

  const desiredSet = new Set(desired);
  const existingByAction = new Map<string, number>(
    (existing as { id: number; action: string }[]).map((permission) => [permission.action, permission.id])
  );

  const stale = (existing as { id: number; action: string }[]).filter(
    (permission) => permission.action.startsWith('api::') && !desiredSet.has(permission.action)
  );

  for (const permission of stale) {
    await strapi.db.query(PERMISSION_UID).delete({ where: { id: permission.id } });
  }

  let created = 0;

  for (const action of desired) {
    if (existingByAction.has(action)) continue;

    await strapi.db.query(PERMISSION_UID).create({ data: { action, role: role.id } });
    created += 1;
  }

  if (created > 0 || stale.length > 0) {
    strapi.log.info(
      `[lms] permissions for "${roleType}": +${created} granted, -${stale.length} revoked`
    );
  }
};

export const applyPermissionMatrix = async (strapi: Core.Strapi) => {
  for (const [roleType, actions] of Object.entries(PERMISSION_MAP)) {
    const isPublic = roleType === 'public';

    await syncRolePermissions(
      strapi,
      roleType,
      isPublic ? actions : [...actions, ...AUTHENTICATED_PLUGIN_ACTIONS]
    );
  }
};

/**
 * New sign-ups become students.
 *
 * `POST /api/auth/local/register` assigns whatever this setting says, and the register
 * payload cannot override it (see `register.allowedFields: []` in config/plugins.ts).
 * Together those two lines are what stops somebody signing themselves up as an admin.
 */
export const setDefaultSignupRole = async (strapi: Core.Strapi) => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = ((await pluginStore.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>;

  if (advanced.default_role === ROLES.STUDENT) return;

  await pluginStore.set({
    key: 'advanced',
    value: { ...advanced, default_role: ROLES.STUDENT },
  });

  strapi.log.info(`[lms] default sign-up role set to "${ROLES.STUDENT}"`);
};

/**
 * Promotes a named account to admin on boot.
 *
 * This closes the bootstrap hole in a production deploy. With `SEED_DEMO_DATA` off there
 * is no admin, and because nobody can self-assign a role, there would be no way to create
 * one through the application at all. The alternative is remembering to go into Strapi's
 * own admin panel and edit the row by hand, which is a manual step nobody documents and
 * everybody forgets.
 *
 * Deliberately narrow:
 *   - It only ever promotes TO admin. It never demotes, so it cannot fight an admin who
 *     later reassigns roles through the panel.
 *   - It does not create the account. The person still signs up normally and proves they
 *     own the address; this only raises an account that already exists. An env var that
 *     could conjure a privileged account out of nothing is a much worse thing to leak.
 *   - It is idempotent, so leaving the variable set is harmless.
 *   - A missing account is logged loudly rather than silently ignored, because the usual
 *     cause is a typo in the address and the symptom otherwise is "why am I not an admin".
 */
export const promoteBootstrapAdmin = async (strapi: Core.Strapi) => {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  if (!email) return;

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    populate: { role: true },
  });

  if (!user) {
    strapi.log.warn(
      `[lms] BOOTSTRAP_ADMIN_EMAIL is set to "${email}" but no account has that address. ` +
        'Sign up with it first, then restart, and the account will be promoted.'
    );
    return;
  }

  if (user.role?.type === ROLES.ADMIN) return;

  const adminRole = await strapi.db
    .query(ROLE_UID)
    .findOne({ where: { type: ROLES.ADMIN } });

  if (!adminRole) {
    strapi.log.error('[lms] cannot promote the bootstrap admin: the admin role is missing');
    return;
  }

  await strapi.plugin('users-permissions').service('user').edit(user.id, { role: adminRole.id });

  strapi.log.info(`[lms] promoted ${email} to admin (BOOTSTRAP_ADMIN_EMAIL)`);
};
