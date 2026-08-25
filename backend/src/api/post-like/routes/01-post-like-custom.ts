import { ROLES } from '../../../utils/permissions';

export default {
  routes: [
    {
      method: 'GET',
      path: '/post-likes/post/:postDocumentId',
      handler: 'post-like.forPost',
      // Public: the count is part of the post, and a logged-out visitor sees it too.
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/post-likes/toggle',
      handler: 'post-like.toggle',
      config: {
        policies: [
          {
            name: 'global::has-role',
            config: {
              roles: [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR, ROLES.STUDENT],
            },
          },
        ],
      },
    },
  ],
};
