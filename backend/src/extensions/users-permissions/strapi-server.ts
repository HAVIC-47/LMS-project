import type { Core } from '@strapi/strapi';

/**
 * Extension of the users-permissions plugin.
 *
 * `GET /api/users/me` ships without the user's role attached, and `?populate=role` on it
 * is ignored. That is a problem for a role-based app: the frontend has to know which of
 * the four roles it is rendering for, and asking a second endpoint for it would mean two
 * round trips on every page load — or worse, trusting a role kept in client state.
 *
 * The override loads the role and returns an explicit projection. Explicit rather than
 * spreading the row, because the user table also holds `password`, `resetPasswordToken`
 * and `confirmationToken`, and a spread is one refactor away from leaking them.
 */
export default (plugin: {
  controllers: Record<string, Record<string, unknown>>;
}) => {
  plugin.controllers.user.me = async (ctx: {
    state: { user?: { id: number } };
    unauthorized: (message?: string) => unknown;
    body: unknown;
  }) => {
    const authenticated = ctx.state.user;

    if (!authenticated) {
      return ctx.unauthorized('You must be logged in');
    }

    const strapiInstance = strapi as Core.Strapi;

    const user = await strapiInstance.db.query('plugin::users-permissions.user').findOne({
      where: { id: authenticated.id },
      populate: { role: true },
    });

    if (!user) {
      return ctx.unauthorized('User no longer exists');
    }

    ctx.body = {
      id: user.id,
      documentId: user.documentId,
      username: user.username,
      email: user.email,
      confirmed: user.confirmed,
      blocked: user.blocked,
      createdAt: user.createdAt,
      // Profile fields travel with the session because the header renders the avatar on
      // every page. Fetching them separately would mean a second round trip on each
      // navigation to draw one image.
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      website: user.website ?? null,
      role: user.role
        ? { id: user.role.id, name: user.role.name, type: user.role.type }
        : null,
    };
  };

  return plugin;
};
