import { ROLES } from '../../../utils/permissions';

const WRITERS_ONLY = [
  { name: 'global::has-role', config: { roles: [ROLES.ADMIN, ROLES.CONTENT_MANAGER] } },
];

export default {
  routes: [
    {
      method: 'GET',
      path: '/blog-posts/mine',
      handler: 'blog-post.mine',
      config: { policies: WRITERS_ONLY },
    },
    {
      method: 'GET',
      path: '/blog-posts/insights',
      handler: 'blog-post.insights',
      config: { policies: WRITERS_ONLY },
    },
    {
      method: 'POST',
      path: '/blog-posts/:id/publish',
      handler: 'blog-post.publish',
      config: { policies: WRITERS_ONLY },
    },
    {
      method: 'POST',
      path: '/blog-posts/:id/unpublish',
      handler: 'blog-post.unpublish',
      config: { policies: WRITERS_ONLY },
    },
  ],
};
