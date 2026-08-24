import { factories } from '@strapi/strapi';
import { ROLES } from '../../../utils/permissions';

const WRITERS = [ROLES.ADMIN, ROLES.CONTENT_MANAGER];

/**
 * "Write / manage blog posts" is Admin and Content Manager only — instructors and
 * students have no write access at all. Reading is open to everybody, including
 * logged-out visitors, but the controller pins them to published posts.
 */
export default factories.createCoreRouter('api::blog-post.blog-post', {
  config: {
    create: { policies: [{ name: 'global::has-role', config: { roles: WRITERS } }] },
    update: { policies: [{ name: 'global::has-role', config: { roles: WRITERS } }] },
    delete: { policies: [{ name: 'global::has-role', config: { roles: WRITERS } }] },
  },
});
