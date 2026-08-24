import type { Core } from '@strapi/strapi';
import { applyPermissionMatrix, ensureRoles, setDefaultSignupRole } from './bootstrap/roles';
import { seedDemoData } from './bootstrap/seed';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * Runs on every boot, before the server starts accepting requests.
   *
   * Order matters: the roles have to exist before permissions can be attached to them, and
   * both have to exist before the seed can create users that belong to them.
   *
   * All three steps are idempotent, so this is safe on a warm database as well as a cold
   * one — which is the point. A Railway deploy against a fresh Postgres comes up with the
   * same access rules as a laptop, with nothing configured by hand.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureRoles(strapi);
    await applyPermissionMatrix(strapi);
    await setDefaultSignupRole(strapi);

    if (process.env.SEED_DEMO_DATA === 'true') {
      try {
        await seedDemoData(strapi);
      } catch (error) {
        // A failed seed must not stop the server — the app is still usable, just empty.
        strapi.log.error(`[lms] demo seed failed: ${(error as Error).message}`);
      }
    }
  },
};
